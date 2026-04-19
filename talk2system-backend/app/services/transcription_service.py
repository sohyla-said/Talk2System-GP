import os
import re
from pathlib import Path

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

    # =========================
    # STEP 1: CHECK AUDIO LENGTH
    # =========================
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

    # =========================
    # STEP 2: TRANSCRIBE
    # =========================
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
        segment = TranscriptSegment(
            session_id=session_id,
            speaker=str(seg["speaker"]),
            start_time=seg.get("start"),   # None is stored as NULL for text-upload segments
            end_time=seg.get("end"),       # None is stored as NULL for text-upload segments
            text=seg["text"]
        )
        db.add(segment)

        full_text.append(f"Speaker {seg['speaker']}: {seg['text']}")

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
        entry = {
            "speaker": f"Speaker {seg.speaker}",
            "text": seg.text,
        }
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

def parse_transcript_text(raw_text: str) -> list[dict]:
    # Split on every occurrence of "SomeLabel SomeId:" that looks like a speaker tag.
    pattern = re.compile(r'([A-Za-z][A-Za-z0-9_]*(?:\s+[A-Za-z0-9_]+)?)\s*:')

    parts = pattern.split(raw_text.strip())
    # pattern.split → ['', speaker1, text1, speaker2, text2, ...]

    segments = []

    it = iter(parts)
    next(it, None)  # skip the leading empty string before the first speaker tag

    for speaker_label, text_chunk in zip(it, it):
        speaker_label = speaker_label.strip()
        text_chunk = text_chunk.strip()

        if not text_chunk:
            continue

        # Strip "Speaker " prefix → store just "A", "B", etc.
        raw_speaker = re.sub(r'^Speaker\s+', '', speaker_label, flags=re.IGNORECASE).strip()

        segments.append({
            "speaker": raw_speaker,
            "text": text_chunk,
            "start": None,   # no timing available for text transcripts
            "end": None,
            "chunk": 0,
        })

    return segments


def save_transcript_text(db: Session, session_id: int, raw_text: str) -> str:
    """
    Parse raw transcript text and persist segments using the existing
    save_transcription() pipeline.  Returns the full joined transcript string.
    """
    diarization = parse_transcript_text(raw_text)

    if not diarization:
        raise ValueError(
            "Could not parse any speaker segments from the provided transcript. "
            "Make sure it follows the format  'Speaker X: <text>'."
        )

    return save_transcription(db, session_id, diarization)
