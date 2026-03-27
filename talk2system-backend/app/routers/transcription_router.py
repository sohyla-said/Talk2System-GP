from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.services.transcription_service import transcribe_audio, save_transcription

router = APIRouter()

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), db: Session = Depends(get_db)):

    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Create session
    session = SessionModel(
        title=file.filename,
        audio_file_path=file_path,
        status="processing"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    diarization = transcribe_audio(file_path)

    save_transcription(db, session.id, diarization)

    session.status = "completed"
    db.commit()

    return {"session_id": session.id}