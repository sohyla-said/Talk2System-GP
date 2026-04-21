import os
from pathlib import Path
import re

import librosa
from pydub import AudioSegment
import assemblyai as aai
from dotenv import load_dotenv

from sqlalchemy.orm import Session
from app.models.session import Session 
from app.models.transcript import TranscriptSegment

MAX_MINUTES = 15
CHUNK_DIR = "chunks"
os.makedirs(CHUNK_DIR, exist_ok=True)

# Ensure env vars are available even when this module is run directly.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _configure_assemblyai_key() -> None:
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise ValueError(
            "Missing ASSEMBLYAI_API_KEY. Add it to app/.env or your environment."
        )
    aai.settings.api_key = api_key

def transcribe_audio(file_path: str):
    _configure_assemblyai_key()


    # STEP 1: CHECK AUDIO LENGTH
    audio, sr = librosa.load(file_path, sr=None)
    duration_minutes = len(audio) / sr / 60

    audio_segment = AudioSegment.from_file(file_path)
    chunk_length_ms = MAX_MINUTES * 60 * 1000

    chunk_files = []

    if duration_minutes > MAX_MINUTES:
        for i in range(0, len(audio_segment), chunk_length_ms):
            chunk = audio_segment[i:i + chunk_length_ms]
            chunk_path = f"{CHUNK_DIR}/chunk_{i//chunk_length_ms}.mp3"
            chunk.export(chunk_path, format="mp3")
            chunk_files.append(chunk_path)
    else:
        chunk_files.append(file_path)

  
    # STEP 2: TRANSCRIBE
    config = aai.TranscriptionConfig(
            speaker_labels=True,
            punctuate=True,
            format_text=True,
            speech_models=["universal-2"]
    )

    transcriber = aai.Transcriber(config=config)

    final_diarization = []

    for idx, chunk in enumerate(chunk_files):
        transcript = transcriber.transcribe(chunk)

        while transcript.status not in [
            aai.TranscriptStatus.completed,
            aai.TranscriptStatus.error
        ]:
            transcript = aai.Transcript.get(transcript.id)

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(transcript.error)

        for u in transcript.utterances:
            final_diarization.append({
                "speaker": u.speaker,
                "start": u.start,
                "end": u.end,
                "text": u.text,
                "chunk": idx
            })
    print("AssemblyAI key loaded:", bool(os.getenv("ASSEMBLYAI_API_KEY")))
    return final_diarization


def save_transcription(db: Session, session_id: int, diarization):
    full_text = []

    for seg in diarization:
        raw_speaker = seg.get("speaker")  

        segment = TranscriptSegment(
            session_id=session_id,
            speaker=str(raw_speaker) if raw_speaker is not None else None,
            start_time=seg.get("start"),
            end_time=seg.get("end"),
            text=seg["text"]
        )
        db.add(segment)

        line = f"Speaker {raw_speaker}: {seg['text']}" if raw_speaker else seg["text"]
        full_text.append(line)

    db.commit()

    return "\n".join(full_text)


def _ms_to_mmss(ms: int) -> str:
    """Convert milliseconds (AssemblyAI format) to a human-readable mm:ss string."""
    total_seconds = int(ms) // 1000
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes:02d}:{seconds:02d}"
 
 
def get_transcript_by_session(db: Session, session_id: int):
    # Use start_time for ordering when it exists (audio flow), fall back to id
    # (insertion order) for text-upload segments that have NULL timestamps.
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )

    if not segments:
        return []

    result = []
    for seg in segments:
        entry = {"text": seg.text}
        # Only include speaker when it was recorded (omitted for speakerless transcripts)
        if seg.speaker is not None:
            entry["speaker"] = f"Speaker {seg.speaker}"
        # Only include timestamps when they were actually recorded (audio flow)
        if seg.start_time is not None:
            entry["start_time"] = _ms_to_mmss(seg.start_time)
        if seg.end_time is not None:
            entry["end_time"] = _ms_to_mmss(seg.end_time)
        result.append(entry)

    return result

def update_transcript_segment(
    db: Session,
    session_id: int,
    segment_index: int,
    speaker: str,
    text: str,
) -> bool:
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )
 
    if segment_index < 0 or segment_index >= len(segments):
        return False
 
    segment = segments[segment_index]
    # Strip the "Speaker " prefix that the frontend adds back before saving
    raw_speaker = speaker.removeprefix("Speaker ").strip()
    segment.speaker = raw_speaker
    segment.text = text
    db.commit()
    return True


# =============================================================================
# TEXT TRANSCRIPT PARSING  (used by the "Upload Transcript" flow)
# =============================================================================

# Matches labels like "Speaker A:", "Speaker B:", "Speaker 1:" at the start
# of a line or inline. Captures only the label suffix (A, B, 1…).
_SPEAKER_TAG_RE = re.compile(
    r'(?:^|\n)\s*Speaker\s+([A-Za-z0-9_]+)\s*:',
    re.IGNORECASE,
)


def _has_speaker_tags(text: str) -> bool:
    """Return True if the text contains at least one 'Speaker X:' label."""
    return bool(_SPEAKER_TAG_RE.search(text))


def parse_transcript_text(raw_text: str) -> list[dict]:
    raw_text = raw_text.strip()

    # Strip wrapping quotes:  "..." → ...
    if raw_text.startswith('"') and raw_text.endswith('"') and len(raw_text) > 2:
        raw_text = raw_text[1:-1].strip()

    # ── Mode B: no speaker tags → one segment, speaker NULL ──────────────
    if not _has_speaker_tags(raw_text):
        return [
            {
                "speaker": None,
                "text": raw_text,
                "start": None,
                "end": None,
                "chunk": 0,
            }
        ]

    # ── Mode A: split on every "Speaker X:" occurrence ───────────────────
    # Replace newlines with spaces first so inline and newline formats both work.
    normalised = raw_text.replace("\n", " ").replace("\r", " ")

    # Split pattern: "Speaker <label>:"
    split_re = re.compile(r'Speaker\s+([A-Za-z0-9_]+)\s*:', re.IGNORECASE)
    parts = split_re.split(normalised)
    # split() with one capture group → ['pre', label1, text1, label2, text2, …]

    segments = []
    it = iter(parts)
    next(it, None)  # discard any text before the first speaker tag

    for label, text_chunk in zip(it, it):
        label = label.strip()
        text_chunk = text_chunk.strip()
        if not text_chunk:
            continue
        segments.append(
            {
                "speaker": label,   # e.g. "A", "B", "1"
                "text": text_chunk,
                "start": None,
                "end": None,
                "chunk": 0,
            }
        )

    return segments


def delete_transcript_segments(
    db: Session,
    session_id: int,
    segment_indices: list[int],
) -> int:
    """
    Delete multiple transcript segments by their 0-based indices.
    Returns the number of segments actually deleted.
    """
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
        .all()
    )

    deleted = 0
    for idx in segment_indices:
        if 0 <= idx < len(segments):
            db.delete(segments[idx])
            deleted += 1

    db.commit()
    return deleted


def save_transcript_text(db: Session, session_id: int, raw_text: str) -> str:
    if not raw_text.strip():
        raise ValueError("Transcript text is empty.")

    diarization = parse_transcript_text(raw_text)
    return save_transcription(db, session_id, diarization)