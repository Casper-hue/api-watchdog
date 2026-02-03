from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

Base = declarative_base()

class Request(Base):
    __tablename__ = "requests"
    
    id = Column(String, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    project_id = Column(String, index=True)
    provider = Column(String)
    model = Column(String)
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_cost_usd = Column(Float)
    similarity_score = Column(Float)
    pattern_score = Column(Integer)
    advisor_level = Column(Integer)
    prompt_text = Column(String)  # Added to store the prompt for similarity analysis (when privacy allows)
    progress_indicator = Column(String)  # "stuck", "exploring", "refining", "resolved"
    token_efficiency = Column(Float)  # output_tokens / input_tokens

# Feedback table for user feedback
class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(String, primary_key=True)
    request_id = Column(String)  # Reference to the request this feedback is about
    is_accurate = Column(Integer)  # 1 for accurate, 0 for inaccurate (false positive)
    timestamp = Column(DateTime, default=datetime.utcnow)
    project_id = Column(String, index=True)  # Project this feedback belongs to
    message = Column(String)  # Optional user message about the feedback

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/watchdog.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize the database and create tables"""
    # Create data directory if it doesn't exist
    os.makedirs("data", exist_ok=True)
    # Create all tables with the new schema (without dropping existing data)
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency for getting DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()