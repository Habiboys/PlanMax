"""
FastAPI server untuk layanan ML detector blocker.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import traceback

from blocker_detector import BlockerDetector
from timeline_predictor import TimelinePredictor


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
predictor = TimelinePredictor()

# Pydantic models untuk request/response
class TaskData(BaseModel):
    """Model untuk data task yang akan diprediksi"""
    id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: str = "Medium"  # High, Medium, Low
    team_size: Optional[str] = "Medium"  # Large, Medium, Small
    teamSize: Optional[str] = None  # Alternative field name
    task_type: Optional[str] = "Development"  # Development, Testing, Meeting, Research, Documentation
    taskType: Optional[str] = None  # Alternative field name
    estimated_hours: Optional[float] = 20
    estimatedHours: Optional[float] = None  # Alternative field name
    word_count: Optional[int] = None
    dependency_count: Optional[int] = 0
    dependencies: Optional[Union[List[Any], int]] = []
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class TimelinePredictionRequest(BaseModel):
    """Request model untuk prediksi timeline"""
    task: Dict[str, Any]
    historical_tasks: Optional[List[Dict[str, Any]]] = []

class TimelinePredictionResponse(BaseModel):
    """Response model untuk hasil prediksi"""
    task_id: int
    predicted_days: Optional[int]
    confidence: float
    predicted_completion_date: Optional[str]
    factors: List[str]
    suggest_earlier_start: bool = False
    suggest_later_end: bool = False

# Comment model
class Comment(BaseModel):
    content: str
    createdAt: Optional[str] = None
    userId: Optional[int] = None

# Request models
class BlockerDetectionRequest(BaseModel):
    text: str

# Response model
class BlockerDetectionResponse(BaseModel):
    is_blocker: bool
    confidence: float
    flagged_phrases: list
    recommendation: str
    probabilities: dict


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
    
    result = detector.detect_blockers(request.text)
    return result


@app.post("/predict-timeline", response_model=TimelinePredictionResponse)
async def predict_timeline(request: TimelinePredictionRequest):
    """Endpoint untuk memprediksi timeline task"""
    try:
        # Validasi input
        if not request.task:
            raise HTTPException(status_code=400, detail="Task data cannot be empty")
        
        # Validasi dan normalisasi data task
        task_dict = validate_task_data(request.task)
        
        # Prediksi timeline
        prediction_result = predictor.predict(task_dict)
        if not prediction_result:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate prediction"
            )
        
        # Generate analisis tambahan
        factors = _generate_additional_analysis(task_dict, prediction_result)
        
        # Hitung tanggal selesai yang diprediksi
        predicted_completion_date = None
        if "startDate" in request.task:
            try:
                start_date = datetime.fromisoformat(request.task["startDate"].replace('Z', '+00:00'))
                predicted_days = prediction_result['predicted_days']
                predicted_completion_date = (start_date + timedelta(days=predicted_days)).isoformat()
            except Exception as e:
                print(f"Error calculating completion date: {str(e)}")
        
        # Tentukan saran untuk jadwal
        suggest_earlier_start = False
        suggest_later_end = False
        
        if "startDate" in request.task and "endDate" in request.task:
            try:
                start_date = datetime.fromisoformat(request.task["startDate"].replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(request.task["endDate"].replace('Z', '+00:00'))
                planned_days = (end_date - start_date).days + 1
                
                if prediction_result['predicted_days'] > planned_days:
                    suggest_later_end = True
                elif prediction_result['predicted_days'] < planned_days * 0.7:
                    suggest_earlier_start = False  # Lebih baik mulai tepat waktu
            except Exception as e:
                print(f"Error analyzing dates: {str(e)}")
        
        return {
            "task_id": request.task.get("id", 0),
            "predicted_days": prediction_result['predicted_days'],
            "confidence": prediction_result['confidence'],
            "predicted_completion_date": predicted_completion_date,
            "factors": factors,
            "suggest_earlier_start": suggest_earlier_start,
            "suggest_later_end": suggest_later_end
        }
        
    except Exception as e:
        print(f"Error in predict_timeline: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/predict-bulk")
async def predict_bulk_timeline(tasks: List[TaskData]):
    """
    Prediksi timeline untuk multiple tasks sekaligus
    """
    if not predictor.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Model tidak tersedia"
        )
    
    if len(tasks) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 tasks per request"
        )
    
    results = []
    
    for task in tasks:
        try:
            task_dict = task.dict()
            
            # Handle alternative field names
            if task_dict.get('teamSize') and not task_dict.get('team_size'):
                task_dict['team_size'] = task_dict['teamSize']
            if task_dict.get('taskType') and not task_dict.get('task_type'):
                task_dict['task_type'] = task_dict['taskType']
            if task_dict.get('estimatedHours') and not task_dict.get('estimated_hours'):
                task_dict['estimated_hours'] = task_dict['estimatedHours']
            
            prediction_result = predictor.predict(task_dict)
            
            results.append({
                "task_id": task_dict.get('id'),
                "predicted_days": prediction_result['predicted_days'],
                "confidence": prediction_result['confidence'],
                "predicted_completion_date": prediction_result.get('predicted_completion_date'),
                "factors": prediction_result['factors'][:3],  # Top 3 factors only
                "error": prediction_result.get('error')
            })
            
        except Exception as e:
            results.append({
                "task_id": task.id,
                "predicted_days": None,
                "confidence": 0.0,
                "predicted_completion_date": None,
                "factors": [],
                "error": str(e)
            })
    
    return {"predictions": results, "total": len(results)}

def validate_task_data(task: Dict[str, Any]) -> Dict[str, Any]:
    """Validasi dan normalisasi data task"""
    required_fields = {
        'priority': 'Medium',
        'team_size': 'Small',
        'task_type': 'Development',
        'estimated_hours': 0,
        'word_count': 0,
        'dependency_count': 0
    }
    
    validated_task = {}
    
    # Copy semua field yang ada di task data
    for field, default_value in required_fields.items():
        # Handle alternative field names
        if field == 'team_size' and 'teamSize' in task:
            value = task['teamSize']
        elif field == 'task_type' and 'taskType' in task:
            value = task['taskType']
        elif field == 'estimated_hours' and 'estimatedHours' in task:
            value = task['estimatedHours']
        else:
            value = task.get(field, default_value)
        validated_task[field] = value
    
    return validated_task

def _generate_additional_analysis(task: Dict[str, Any], prediction: Dict[str, Any]) -> List[str]:
    """Generate analisis tambahan berdasarkan task dan hasil prediksi"""
    analysis = []
    
    # Analisis dependensi
    dependency_count = float(task.get('dependency_count', 0))
    if dependency_count > 3:
        analysis.append("Task memiliki banyak dependensi yang dapat mempengaruhi timeline")
    
    # Analisis estimasi waktu
    estimated_hours = float(task.get('estimated_hours', 0))
    if estimated_hours > 40:
        analysis.append("Task memiliki estimasi waktu yang cukup panjang")
    
    # Analisis prioritas
    if task.get('priority') == 'High':
        analysis.append("Task prioritas tinggi perlu perhatian khusus")
    
    return analysis

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "status_code": 404}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return {"error": "Internal server error", "status_code": 500}

if __name__ == "__main__":
    import uvicorn
    
      # Check if model files exist
    if not predictor.is_trained:
        print("⚠️ WARNING: Model files not found!")
        print("   Make sure timeline_predictor_model.pkl and timeline_preprocessor.pkl are in the same directory")
        print("   The API will start but predictions will not work until models are available")
    
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True) 