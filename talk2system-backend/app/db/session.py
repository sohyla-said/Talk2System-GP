from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:0000@localhost:5432/talk2system"

# Default pool (5 + 10 overflow = 15) gets exhausted when several background
# tasks (UML/SRS/requirement generation) each open their own SessionLocal()
# and hold it for the duration of a slow LLM call. Sized up with headroom
# below Postgres's max_connections (100).
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()