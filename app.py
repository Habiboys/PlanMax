"""
FastAPI server untuk layanan ML detector blocker.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from blocker_detector import BlockerDetector
from timeline_predictor import TimelinePredictor

# Initialize FastAPI app
app = FastAPI(
    title="Smart Project Planner ML API",
    description="API untuk mendeteksi potensi blocker dan memprediksi timeline task",
    version="1.0.0"
)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
detector = BlockerDetector()
timeline_predictor = TimelinePredictor()

# Comment model
class Comment(BaseModel):
    content: str
    createdAt: Optional[str] = None
    userId: Optional[int] = None

# Request models
class BlockerDetectionRequest(BaseModel):
    text: str
    threshold: Optional[float] = 0.2

class CommentAnalysisRequest(BaseModel):
    comments: List[Comment]
    threshold: Optional[float] = 0.2

class TaskAnalysisRequest(BaseModel):
    task_id: int
    name: str
    description: Optional[str] = None
    comments: Optional[List[Dict[str, Any]]] = []
    threshold: Optional[float] = 0.2

class TimelinePredictionRequest(BaseModel):
    task: Dict[str, Any]
    historical_tasks: Optional[List[Dict[str, Any]]] = []

# Response models
class BlockerDetectionResponse(BaseModel):
    is_blocker: bool
    confidence: float
    flagged_phrases: List[str]
    recommendation: str

class TaskAnalysisResponse(BaseModel):
    task_id: int
    analysis: BlockerDetectionResponse

class TimelinePredictionResponse(BaseModel):
    task_id: int
    predicted_days: Optional[int]
    confidence: float
    predicted_completion_date: Optional[str]
    factors: List[str]
    suggest_earlier_start: bool = False
    suggest_later_end: bool = False

@app.get("/")
async def root():
    return {"message": "Welcome to Smart Project Planner ML API", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/detect-blockers", response_model=BlockerDetectionResponse)
async def detect_blockers(request: BlockerDetectionRequest):
    """Mendeteksi blocker dari teks."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = detector.detect_blockers(request.text, request.threshold)
    return result

@app.post("/analyze-comments", response_model=BlockerDetectionResponse)
async def analyze_comments(request: CommentAnalysisRequest):
    """Menganalisis komentar untuk menemukan blocker."""
    if not request.comments:
        raise HTTPException(status_code=400, detail="Comments list cannot be empty")
    
    result = detector.analyze_comments(request.comments)
    return result

@app.post("/analyze-task", response_model=TaskAnalysisResponse)
async def analyze_task(request: TaskAnalysisRequest):
    """Menganalisis task dan komentar untuk menemukan blocker."""
    if not request.name:
        raise HTTPException(status_code=400, detail="Task name cannot be empty")
    
    # Extract comments only
    if request.comments:
        # Use the analyze_comments function for better analysis
        comment_analysis = detector.analyze_comments(request.comments)
        
        # Also analyze task name and description
        combined_text = request.name
        if request.description:
            combined_text += " " + request.description
            
        task_text_analysis = detector.detect_blockers(combined_text, request.threshold)
        
        # Combine results, prioritizing comment analysis if it indicates blockers
        if comment_analysis["is_blocker"]:
            result = comment_analysis
        elif task_text_analysis["is_blocker"]:
            result = task_text_analysis
        else:
            # If neither indicates blockers, use the one with higher confidence
            result = comment_analysis if comment_analysis["confidence"] > task_text_analysis["confidence"] else task_text_analysis
    else:
        # If no comments, just analyze task text
        combined_text = request.name
        if request.description:
            combined_text += " " + request.description
            
        result = detector.detect_blockers(combined_text, request.threshold)
    
    return {
        "task_id": request.task_id,
        "analysis": result
    }

@app.post("/predict-timeline", response_model=TimelinePredictionResponse)
async def predict_timeline(request: TimelinePredictionRequest):
    """Memprediksi timeline task berdasarkan data historis."""
    if not request.task:
        raise HTTPException(status_code=400, detail="Task data cannot be empty")
    
    # Jika ada data historis, latih model terlebih dahulu
    if request.historical_tasks and len(request.historical_tasks) >= 5:
        timeline_predictor.train(request.historical_tasks)
    
    # Prediksi timeline
    prediction = timeline_predictor.predict(request.task)
    
    # Tambahkan ID task ke hasil
    task_id = request.task.get("id", 0)
    
    # Tambahkan saran untuk tanggal
    suggest_earlier_start = False
    suggest_later_end = False
    
    # Jika predicted_days lebih besar dari selisih endDate dan startDate, sarankan tanggal akhir yang lebih lambat
    if prediction["predicted_days"] is not None and "startDate" in request.task and "endDate" in request.task:
        try:
            start_date = datetime.fromisoformat(request.task["startDate"].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(request.task["endDate"].replace('Z', '+00:00'))
            
            planned_days = (end_date - start_date).days + 1
            
            if prediction["predicted_days"] > planned_days:
                suggest_later_end = True
            elif prediction["predicted_days"] < planned_days * 0.7:
                # Jika prediksi kurang dari 70% dari waktu yang direncanakan, mungkin bisa mulai lebih lambat
                suggest_earlier_start = False  # Tetap false karena umumnya lebih baik mulai lebih awal
        except:
            pass
    
    return {
        "task_id": task_id,
        "predicted_days": prediction["predicted_days"],
        "confidence": prediction["confidence"],
        "predicted_completion_date": prediction["predicted_completion_date"],
        "factors": prediction["factors"],
        "suggest_earlier_start": suggest_earlier_start,
        "suggest_later_end": suggest_later_end
    }

@app.get("/keywords")
async def get_keywords():
    """Get blocker keywords used by the detector."""
    from blocker_detector import BLOCKER_KEYWORDS, RESOLUTION_KEYWORDS, NEGATION_WORDS
    
    return {
        "blocker_keywords": BLOCKER_KEYWORDS,
        "resolution_keywords": RESOLUTION_KEYWORDS,
        "negation_words": NEGATION_WORDS
    }

if __name__ == "__main__":
    import uvicorn
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True) 