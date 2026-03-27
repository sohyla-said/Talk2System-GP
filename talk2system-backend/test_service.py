from app.db.session import SessionLocal
from app.services.transcription_service import save_transcription

db = SessionLocal()

segments = [{"speaker":0,"start":0,"end":1000,"text":"hello"}]

save_transcription(db, 1, segments)