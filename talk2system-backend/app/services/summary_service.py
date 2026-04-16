import os
from google import genai
from sqlalchemy.orm import Session
from app.models.summaries import Summary




client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_summary(transcript: str):
    prompt = f"""
    You are a business analyst assistant.

    Summarize the following transcript into:

    1. Short Summary (2-3 sentences)
    2. Key Points (bullet points) Max 7
    
    Return plain text only. Do not use markdown, hashtags, or any special formatting symbols.

    Transcript:
    {transcript}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text



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