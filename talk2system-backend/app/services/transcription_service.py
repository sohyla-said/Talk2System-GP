# import os
# from pathlib import Path
# import re

# import librosa
# from pydub import AudioSegment
# import assemblyai as aai
# from dotenv import load_dotenv

# from sqlalchemy.orm import Session
# from app.models.session import Session 
# from app.models.transcript import TranscriptSegment

# MAX_MINUTES = 15
# CHUNK_DIR = "chunks"
# os.makedirs(CHUNK_DIR, exist_ok=True)

# # Ensure env vars are available even when this module is run directly.
# load_dotenv(Path(__file__).resolve().parents[1] / ".env")


# def _configure_assemblyai_key() -> None:
#     api_key = os.getenv("ASSEMBLYAI_API_KEY")
#     if not api_key:
#         raise ValueError(
#             "Missing ASSEMBLYAI_API_KEY. Add it to app/.env or your environment."
#         )
#     aai.settings.api_key = api_key

# def transcribe_audio(file_path: str):
#     _configure_assemblyai_key()


#     # STEP 1: CHECK AUDIO LENGTH
#     audio, sr = librosa.load(file_path, sr=None)
#     duration_minutes = len(audio) / sr / 60

#     audio_segment = AudioSegment.from_file(file_path)
#     chunk_length_ms = MAX_MINUTES * 60 * 1000

#     chunk_files = []

#     if duration_minutes > MAX_MINUTES:
#         for i in range(0, len(audio_segment), chunk_length_ms):
#             chunk = audio_segment[i:i + chunk_length_ms]
#             chunk_path = f"{CHUNK_DIR}/chunk_{i//chunk_length_ms}.mp3"
#             chunk.export(chunk_path, format="mp3")
#             chunk_files.append(chunk_path)
#     else:
#         chunk_files.append(file_path)

  
#     # STEP 2: TRANSCRIBE
#     config = aai.TranscriptionConfig(
#             speaker_labels=True,
#             punctuate=True,
#             format_text=True,
#             speech_models=["universal-2"]
#     )

#     transcriber = aai.Transcriber(config=config)

#     final_diarization = []

#     for idx, chunk in enumerate(chunk_files):
#         transcript = transcriber.transcribe(chunk)

#         while transcript.status not in [
#             aai.TranscriptStatus.completed,
#             aai.TranscriptStatus.error
#         ]:
#             transcript = aai.Transcript.get(transcript.id)

#         if transcript.status == aai.TranscriptStatus.error:
#             raise Exception(transcript.error)

#         for u in transcript.utterances:
#             final_diarization.append({
#                 "speaker": u.speaker,
#                 "start": u.start,
#                 "end": u.end,
#                 "text": u.text,
#                 "chunk": idx
#             })
#     print("AssemblyAI key loaded:", bool(os.getenv("ASSEMBLYAI_API_KEY")))
#     return final_diarization


# def save_transcription(db: Session, session_id: int, diarization):
#     full_text = []

#     for seg in diarization:
#         raw_speaker = seg.get("speaker")  

#         segment = TranscriptSegment(
#             session_id=session_id,
#             speaker=str(raw_speaker) if raw_speaker is not None else None,
#             start_time=seg.get("start"),
#             end_time=seg.get("end"),
#             text=seg["text"]
#         )
#         db.add(segment)

#         line = f"Speaker {raw_speaker}: {seg['text']}" if raw_speaker else seg["text"]
#         full_text.append(line)

#     db.commit()

#     return "\n".join(full_text)


# def _ms_to_mmss(ms: int) -> str:
#     """Convert milliseconds (AssemblyAI format) to a human-readable mm:ss string."""
#     total_seconds = int(ms) // 1000
#     minutes = total_seconds // 60
#     seconds = total_seconds % 60
#     return f"{minutes:02d}:{seconds:02d}"
 
 
# def get_transcript_by_session(db: Session, session_id: int):
#     # Use start_time for ordering when it exists (audio flow), fall back to id
#     # (insertion order) for text-upload segments that have NULL timestamps.
#     segments = (
#         db.query(TranscriptSegment)
#         .filter(TranscriptSegment.session_id == session_id)
#         .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
#         .all()
#     )

#     if not segments:
#         return []

#     result = []
#     for seg in segments:
#         entry = {"text": seg.text}
#         # Only include speaker when it was recorded (omitted for speakerless transcripts)
#         if seg.speaker is not None:
#             entry["speaker"] = f"Speaker {seg.speaker}"
#         # Only include timestamps when they were actually recorded (audio flow)
#         if seg.start_time is not None:
#             entry["start_time"] = _ms_to_mmss(seg.start_time)
#         if seg.end_time is not None:
#             entry["end_time"] = _ms_to_mmss(seg.end_time)
#         result.append(entry)

#     return result

# def update_transcript_segment(
#     db: Session,
#     session_id: int,
#     segment_index: int,
#     speaker: str,
#     text: str,
# ) -> bool:
#     segments = (
#         db.query(TranscriptSegment)
#         .filter(TranscriptSegment.session_id == session_id)
#         .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
#         .all()
#     )
 
#     if segment_index < 0 or segment_index >= len(segments):
#         return False
 
#     segment = segments[segment_index]
#     # Strip the "Speaker " prefix that the frontend adds back before saving
#     raw_speaker = speaker.removeprefix("Speaker ").strip()
#     segment.speaker = raw_speaker
#     segment.text = text
#     db.commit()
#     return True


# # =============================================================================
# # TEXT TRANSCRIPT PARSING  (used by the "Upload Transcript" flow)
# # =============================================================================

# # Matches labels like "Speaker A:", "Speaker B:", "Speaker 1:" at the start
# # of a line or inline. Captures only the label suffix (A, B, 1…).
# _SPEAKER_TAG_RE = re.compile(
#     r'(?:^|\n)\s*Speaker\s+([A-Za-z0-9_]+)\s*:',
#     re.IGNORECASE,
# )

# # Matches real-name speaker labels at the start of a line, e.g.:
# #   "Dr. Kareem:", "Nadia:", "Omar:", "Everyone:"
# # Requires at least one capital letter to avoid matching mid-sentence phrases.
# _REALNAME_TAG_RE = re.compile(
#     r'(?:^|\n)\s*((?:(?:Dr|Mr|Ms|Mrs|Prof)\.?\s+)?[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})\s*:'
# )


# def _has_speaker_tags(text: str) -> bool:
#     """Return True if the text contains at least one speaker label.

#     Accepts both the legacy 'Speaker X:' format and real-name formats
#     such as 'Dr. Kareem:', 'Nadia:', 'Omar:', 'Everyone:', etc.
#     """
#     return bool(_SPEAKER_TAG_RE.search(text) or _REALNAME_TAG_RE.search(text))


# def parse_transcript_text(raw_text: str) -> list[dict]:
#     raw_text = raw_text.strip()

#     # Strip wrapping quotes:  "..." → ...
#     if raw_text.startswith('"') and raw_text.endswith('"') and len(raw_text) > 2:
#         raw_text = raw_text[1:-1].strip()

#     # ── Mode B: no speaker tags → one segment, speaker NULL ──────────────
#     if not _has_speaker_tags(raw_text):
#         return [
#             {
#                 "speaker": None,
#                 "text": raw_text,
#                 "start": None,
#                 "end": None,
#                 "chunk": 0,
#             }
#         ]

#     # ── Mode A: split on every speaker label occurrence ──────────────────
#     # Replace newlines with spaces first so inline and newline formats both work.
#     normalised = raw_text.replace("\n", " ").replace("\r", " ")

#     # Unified split pattern: matches both "Speaker X:" and real names like
#     # "Dr. Kareem:", "Nadia:", "Everyone:", etc.
#     split_re = re.compile(
#         r'(?:Speaker\s+([A-Za-z0-9_]+)'
#         r'|((?:(?:Dr|Mr|Ms|Mrs|Prof)\.?\s+)?'
#         r'[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2}))'
#         r'\s*:',
#         re.IGNORECASE,
#     )

#     matches = list(split_re.finditer(normalised))
#     if not matches:
#         return [{"speaker": None, "text": normalised.strip(), "start": None, "end": None, "chunk": 0}]

#     segments = []
#     for i, match in enumerate(matches):
#         label = (match.group(1) or match.group(2) or "").strip()
#         text_start = match.end()
#         text_end = matches[i + 1].start() if i + 1 < len(matches) else len(normalised)
#         text_chunk = normalised[text_start:text_end].strip()
#         if not text_chunk:
#             continue
#         segments.append(
#             {
#                 "speaker": label,
#                 "text": text_chunk,
#                 "start": None,
#                 "end": None,
#                 "chunk": 0,
#             }
#         )

#     return segments


# def delete_transcript_segments(
#     db: Session,
#     session_id: int,
#     segment_indices: list[int],
# ) -> int:
#     """
#     Delete multiple transcript segments by their 0-based indices.
#     Returns the number of segments actually deleted.
#     """
#     segments = (
#         db.query(TranscriptSegment)
#         .filter(TranscriptSegment.session_id == session_id)
#         .order_by(TranscriptSegment.start_time.nulls_last(), TranscriptSegment.id)
#         .all()
#     )

#     deleted = 0
#     for idx in segment_indices:
#         if 0 <= idx < len(segments):
#             db.delete(segments[idx])
#             deleted += 1

#     db.commit()
#     return deleted


# def save_transcript_text(db: Session, session_id: int, raw_text: str) -> str:
#     if not raw_text.strip():
#         raise ValueError("Transcript text is empty.")

#     diarization = parse_transcript_text(raw_text)
#     return save_transcription(db, session_id, diarization)





"""
app/services/transcription_service.py
Changes:
  - transcribe_audio() detects language via Ollama after transcription and returns
    (diarization, detected_language) instead of just diarization.
  - All other functions unchanged.
"""

import os
from pathlib import Path
import re

import librosa
from pydub import AudioSegment
import assemblyai as aai
from dotenv import load_dotenv

from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel
from app.models.transcript import TranscriptSegment

MAX_MINUTES = 15
CHUNK_DIR = "chunks"
os.makedirs(CHUNK_DIR, exist_ok=True)

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _configure_assemblyai_key() -> None:
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise ValueError(
            "Missing ASSEMBLYAI_API_KEY. Add it to app/.env or your environment."
        )
    aai.settings.api_key = api_key


# ---------------------------------------------------------------------------
# AUDIO TRANSCRIPTION  (returns diarization + detected language)
# ---------------------------------------------------------------------------

def transcribe_audio(file_path: str) -> tuple[list[dict], str | None]:
    """
    Transcribe an audio file using AssemblyAI Universal-2.

    Returns
    -------
    (final_diarization, detected_language)
        detected_language is detected via Ollama after transcription.
        Returns None if detection fails (non-fatal).
    """
    _configure_assemblyai_key()

    # ── STEP 1: CHECK AUDIO LENGTH ─────────────────────────────────────────
    audio, sr = librosa.load(file_path, sr=None)
    duration_minutes = len(audio) / sr / 60

    audio_segment = AudioSegment.from_file(file_path)
    chunk_length_ms = MAX_MINUTES * 60 * 1000

    chunk_files = []
    if duration_minutes > MAX_MINUTES:
        for i in range(0, len(audio_segment), chunk_length_ms):
            chunk = audio_segment[i:i + chunk_length_ms]
            chunk_path = f"{CHUNK_DIR}/chunk_{i // chunk_length_ms}.mp3"
            chunk.export(chunk_path, format="mp3")
            chunk_files.append(chunk_path)
    else:
        chunk_files.append(file_path)

    # ── STEP 2: TRANSCRIBE ─────────────────────────────────────────────────
    # Keep the original working config — language_detection=True conflicts
    # with speaker_labels=True in AssemblyAI, so we detect language ourselves
    # via Ollama after transcription instead.
    config = aai.TranscriptionConfig(
        speaker_labels=True,
        punctuate=True,
        format_text=True,
        speech_models=["universal-2"],
    )

    transcriber = aai.Transcriber(config=config)

    final_diarization: list[dict] = []

    for idx, chunk in enumerate(chunk_files):
        transcript = transcriber.transcribe(chunk)

        while transcript.status not in (
            aai.TranscriptStatus.completed,
            aai.TranscriptStatus.error,
        ):
            transcript = aai.Transcript.get(transcript.id)

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(transcript.error)

        for u in transcript.utterances:
            final_diarization.append({
                "speaker": u.speaker,
                "start":   u.start,
                "end":     u.end,
                "text":    u.text,
                "chunk":   idx,
            })

    print("AssemblyAI key loaded:", bool(os.getenv("ASSEMBLYAI_API_KEY")))

    # ── STEP 3: DETECT LANGUAGE via Ollama (non-fatal) ─────────────────────
    detected_language: str | None = None
    try:
        from app.services.translation_service import detect_language
        sample = " ".join(seg["text"] for seg in final_diarization[:8])
        detected_language = detect_language(sample)
        print("Detected language:", detected_language)
    except Exception as lang_err:
        print(f"Language detection failed (non-fatal): {lang_err}")

    return final_diarization, detected_language



# ---------------------------------------------------------------------------
# SAVE TRANSCRIPTION SEGMENTS
# ---------------------------------------------------------------------------

def save_transcription(db: Session, session_id: int, diarization: list[dict]) -> str:
    full_text = []

    for seg in diarization:
        raw_speaker = seg.get("speaker")

        segment = TranscriptSegment(
            session_id=session_id,
            speaker=str(raw_speaker) if raw_speaker is not None else None,
            start_time=seg.get("start"),
            end_time=seg.get("end"),
            text=seg["text"],
        )
        db.add(segment)

        line = f"Speaker {raw_speaker}: {seg['text']}" if raw_speaker else seg["text"]
        full_text.append(line)

    db.commit()
    return "\n".join(full_text)


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _ms_to_mmss(ms: int) -> str:
    """Convert milliseconds (AssemblyAI format) to mm:ss string."""
    total_seconds = int(ms) // 1000
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes:02d}:{seconds:02d}"


def get_transcript_by_session(db: Session, session_id: int) -> list[dict]:
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
        if seg.speaker is not None:
            entry["speaker"] = f"Speaker {seg.speaker}"
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
    raw_speaker = speaker.removeprefix("Speaker ").strip()
    segment.speaker = raw_speaker
    segment.text = text
    db.commit()
    return True


def delete_transcript_segments(
    db: Session,
    session_id: int,
    segment_indices: list[int],
) -> int:
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


# =============================================================================
# TEXT TRANSCRIPT PARSING  (used by the "Upload Transcript" flow)
# =============================================================================

_SPEAKER_TAG_RE = re.compile(
    r'(?:^|\n)\s*Speaker\s+([A-Za-z0-9_]+)\s*:',
    re.IGNORECASE,
)

_REALNAME_TAG_RE = re.compile(
    r'(?:^|\n)\s*((?:(?:Dr|Mr|Ms|Mrs|Prof)\.?\s+)?[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})\s*:'
)


def _has_speaker_tags(text: str) -> bool:
    return bool(_SPEAKER_TAG_RE.search(text) or _REALNAME_TAG_RE.search(text))


def parse_transcript_text(raw_text: str) -> list[dict]:
    """Parse a raw text transcript into diarization-style segments."""
    if not _has_speaker_tags(raw_text):
        return [{"speaker": None, "start": None, "end": None, "text": raw_text.strip()}]

    combined = re.compile(
        r'(?:^|\n)\s*'
        r'((?:(?:Dr|Mr|Ms|Mrs|Prof)\.?\s+)?(?:Speaker\s+)?[A-Za-z0-9_][A-Za-z0-9_ ]*?)\s*:',
        re.IGNORECASE,
    )

    parts = combined.split(raw_text)
    segments = []

    i = 1
    while i < len(parts) - 1:
        speaker_label = parts[i].strip()
        text_block = parts[i + 1].strip()
        if text_block:
            segments.append({
                "speaker": speaker_label,
                "start": None,
                "end": None,
                "text": text_block,
            })
        i += 2

    return segments if segments else [
        {"speaker": None, "start": None, "end": None, "text": raw_text.strip()}
    ]


def save_transcript_text(db: Session, session_id: int, raw_text: str) -> str:
    if not raw_text.strip():
        raise ValueError("Transcript text is empty.")
    diarization = parse_transcript_text(raw_text)
    return save_transcription(db, session_id, diarization)

