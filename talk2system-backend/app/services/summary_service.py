import requests
from sqlalchemy.orm import Session
from app.models.summaries import Summary

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"


def generate_summary(transcript: str) -> str:
    prompt = f"""
    You are a business analyst assistant.

    Summarize the following transcript into:

    1. Short Summary (3-4 sentences)
    2. Key Points (bullet points) Max 6
    
    Return plain text only in English. Do not use markdown, hashtags, or any special formatting symbols.

    Transcript:
    {transcript}
    """

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }
    )

    response.raise_for_status()
    return response.json()["response"]


def save_summary(db: Session, session_id: int, summary_text: str):
    """
    Save or update generated summary in the database.
    """
    existing = db.query(Summary).filter(Summary.session_id == session_id).first()

    if existing:
        existing.summary = summary_text
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_summary = Summary(
            session_id=session_id,
            summary=summary_text
        )
        db.add(new_summary)
        db.commit()
        db.refresh(new_summary)
        return new_summary
