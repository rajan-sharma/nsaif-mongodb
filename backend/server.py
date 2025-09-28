from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Security Assessment API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    organization_name: str
    email: str
    corporate_email: Optional[str] = None
    designation: str
    contact_number: Optional[str] = None
    password_hash: str
    role: str = "user"  # "user" or "admin"
    status: str = "active"  # "active" or "blocked"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    organization_name: str
    email: str
    corporate_email: Optional[str] = None
    designation: str
    contact_number: Optional[str] = None
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Domain(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0

class SubDomain(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    domain_id: str
    description: Optional[str] = None

class Control(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    definition: str
    subdomain_id: str

class Metric(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    control_id: str
    description: Optional[str] = None

class Answer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    answer_text: str
    score_value: int  # 0-5

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_text: str
    domain_id: str
    subdomain_id: str
    control_id: str
    metric_id: str
    answers: List[Answer]

class UserAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    submission_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"  # "in_progress" or "completed"

class UserResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assessment_id: str
    user_id: str
    question_id: str
    selected_answer_id: str
    # Denormalized fields for analytics
    domain_id: str
    subdomain_id: str
    control_id: str
    metric_id: str
    score_value: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssessmentSubmission(BaseModel):
    responses: List[Dict[str, str]]  # [{"question_id": "...", "selected_answer_id": "..."}]

# Auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {"user_id": user_id, "role": role}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if user.get("status") == "blocked":
            raise HTTPException(status_code=403, detail="Account blocked")
            
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Basic endpoint
@api_router.get("/")
async def root():
    return {"message": "Security Assessment API is running"}

# Auth endpoints
@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_dict = user_data.dict()
    user_dict["password_hash"] = hash_password(user_dict.pop("password"))
    user = User(**user_dict)
    
    await db.users.insert_one(user.dict())
    
    token = create_token(user.id, user.role)
    return {"token": token, "user": {"id": user.id, "email": user.email, "role": user.role}}

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")
    
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "role": user["role"]}}

# Assessment endpoints
@api_router.get("/domains", response_model=List[Domain])
async def get_domains():
    domains = await db.domains.find().sort("order", 1).to_list(length=None)
    return [Domain(**domain) for domain in domains]

@api_router.get("/domains/{domain_id}/questions")
async def get_domain_questions(domain_id: str):
    # Get all questions for the domain
    questions = await db.questions.find({"domain_id": domain_id}).to_list(length=None)
    
    # Get related data for each question
    result = []
    for question in questions:
        # Get subdomain, control, metric info
        subdomain = await db.subdomains.find_one({"id": question["subdomain_id"]})
        control = await db.controls.find_one({"id": question["control_id"]})
        metric = await db.metrics.find_one({"id": question["metric_id"]})
        
        question_data = {
            "id": question["id"],
            "question_text": question["question_text"],
            "answers": question["answers"],
            "subdomain": subdomain["name"] if subdomain else "",
            "control": {
                "name": control["name"] if control else "",
                "definition": control["definition"] if control else ""
            },
            "metric": metric["name"] if metric else "",
            "domain_id": question["domain_id"],
            "subdomain_id": question["subdomain_id"],
            "control_id": question["control_id"],
            "metric_id": question["metric_id"]
        }
        result.append(question_data)
    
    return result

@api_router.post("/assessments/submit")
async def submit_assessment(submission: AssessmentSubmission, current_user: User = Depends(get_current_user)):
    # Create assessment record
    assessment = UserAssessment(user_id=current_user.id)
    await db.user_assessments.insert_one(assessment.dict())
    
    # Process each response
    response_records = []
    for response_data in submission.responses:
        question_id = response_data["question_id"]
        selected_answer_id = response_data["selected_answer_id"]
        
        # Get question details
        question = await db.questions.find_one({"id": question_id})
        if not question:
            continue
            
        # Find the selected answer and its score
        selected_answer = None
        for answer in question["answers"]:
            if answer["id"] == selected_answer_id:
                selected_answer = answer
                break
        
        if not selected_answer:
            continue
            
        # Create response record
        user_response = UserResponse(
            assessment_id=assessment.id,
            user_id=current_user.id,
            question_id=question_id,
            selected_answer_id=selected_answer_id,
            domain_id=question["domain_id"],
            subdomain_id=question["subdomain_id"],
            control_id=question["control_id"],
            metric_id=question["metric_id"],
            score_value=selected_answer["score_value"]
        )
        
        response_records.append(user_response.dict())
    
    # Bulk insert all responses
    if response_records:
        await db.user_responses.insert_many(response_records)
    
    return {"assessment_id": assessment.id, "message": "Assessment submitted successfully"}

@api_router.get("/assessments/my-assessments")
async def get_user_assessments(current_user: User = Depends(get_current_user)):
    assessments = await db.user_assessments.find({"user_id": current_user.id}).sort("submission_date", -1).to_list(length=None)
    return [UserAssessment(**assessment) for assessment in assessments]

# Dashboard endpoints  
@api_router.get("/dashboard/stats/{assessment_id}")
async def get_assessment_stats(assessment_id: str, current_user: User = Depends(get_current_user)):
    # Verify assessment belongs to user
    assessment = await db.user_assessments.find_one({"id": assessment_id, "user_id": current_user.id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get all responses for this assessment
    responses = await db.user_responses.find({"assessment_id": assessment_id}).to_list(length=None)
    
    if not responses:
        return {"total_responses": 0, "domains_completed": 0, "overall_average": 0, "domain_scores": [], "control_performance": []}
    
    # Calculate basic stats
    total_responses = len(responses)
    total_score = sum(response["score_value"] for response in responses)
    overall_average = round(total_score / total_responses, 2) if total_responses > 0 else 0
    
    # Get unique domains completed
    unique_domains = set(response["domain_id"] for response in responses)
    domains_completed = len(unique_domains)
    
    # Calculate domain-wise scores
    domain_scores = {}
    control_performance = {}
    
    for response in responses:
        domain_id = response["domain_id"]
        control_id = response["control_id"]
        score = response["score_value"]
        
        # Domain scores
        if domain_id not in domain_scores:
            domain_scores[domain_id] = {"scores": [], "total": 0, "count": 0}
        domain_scores[domain_id]["scores"].append(score)
        domain_scores[domain_id]["total"] += score
        domain_scores[domain_id]["count"] += 1
        
        # Control performance
        if control_id not in control_performance:
            control_performance[control_id] = {"scores": [], "total": 0, "count": 0, "domain_id": domain_id}
        control_performance[control_id]["scores"].append(score)
        control_performance[control_id]["total"] += score
        control_performance[control_id]["count"] += 1
    
    # Get domain names
    domains = await db.domains.find().to_list(length=None)
    domain_name_map = {d["id"]: d["name"] for d in domains}
    
    # Get control names  
    controls = await db.controls.find().to_list(length=None)
    control_name_map = {c["id"]: c["name"] for c in controls}
    
    # Format domain scores with names and averages
    domain_stats = []
    for domain_id, data in domain_scores.items():
        avg_score = round(data["total"] / data["count"], 2)
        domain_stats.append({
            "domain_id": domain_id,
            "domain_name": domain_name_map.get(domain_id, "Unknown"),
            "average_score": avg_score,
            "total_questions": data["count"],
            "total_score": data["total"]
        })
    
    # Format control performance
    control_stats = []
    for control_id, data in control_performance.items():
        avg_score = round(data["total"] / data["count"], 2)
        control_stats.append({
            "control_id": control_id,
            "control_name": control_name_map.get(control_id, "Unknown"),
            "domain_id": data["domain_id"],
            "domain_name": domain_name_map.get(data["domain_id"], "Unknown"),
            "average_score": avg_score,
            "total_questions": data["count"]
        })
    
    # Find top strengths and focus areas
    sorted_domains = sorted(domain_stats, key=lambda x: x["average_score"], reverse=True)
    top_strengths = sorted_domains[:2] if len(sorted_domains) >= 2 else sorted_domains
    focus_areas = sorted_domains[-2:] if len(sorted_domains) >= 2 else []
    
    return {
        "total_responses": total_responses,
        "domains_completed": domains_completed,
        "overall_average": overall_average,
        "submission_date": assessment["submission_date"],
        "domain_scores": domain_stats,
        "control_performance": control_stats,
        "top_strengths": top_strengths,
        "focus_areas": focus_areas
    }

# Admin User Management Endpoints
@api_router.get("/admin/users")
async def get_all_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(length=None)
    return users

@api_router.post("/admin/users")
async def create_user_by_admin(user_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.copy()
    user_dict["password_hash"] = hash_password(user_dict.pop("password"))
    user_dict["id"] = str(uuid.uuid4())
    user = User(**user_dict)
    
    await db.users.insert_one(user.dict())
    return {"message": f"{user_data.get('role', 'user').title()} created successfully", "user": user.dict()}

@api_router.put("/admin/users/{user_id}")
async def update_user_by_admin(user_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if "password" in updates:
        updates["password_hash"] = hash_password(updates.pop("password"))
    
    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user_by_admin(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Admin Statistics
@api_router.get("/admin/platform-stats")
async def get_platform_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # User statistics
    total_users = await db.users.count_documents({})
    admin_users = await db.users.count_documents({"role": "admin"})
    regular_users = await db.users.count_documents({"role": "user"})
    
    # Assessment statistics
    total_assessments = await db.user_assessments.count_documents({})
    total_responses = await db.user_responses.count_documents({})
    
    # Get recent assessments with user details
    recent_assessments = await db.user_assessments.find().sort("submission_date", -1).limit(10).to_list(length=10)
    for assessment in recent_assessments:
        user = await db.users.find_one({"id": assessment["user_id"]})
        assessment["user_name"] = f"{user['first_name']} {user['last_name']}" if user else "Unknown"
        assessment["user_email"] = user["email"] if user else "Unknown"
    
    # User assessment activity
    user_activities = []
    users = await db.users.find({"role": "user"}).to_list(length=None)
    for user in users:
        assessment_count = await db.user_assessments.count_documents({"user_id": user["id"]})
        latest_assessment = await db.user_assessments.find_one({"user_id": user["id"]}, sort=[("submission_date", -1)])
        
        user_activities.append({
            "user_id": user["id"],
            "name": f"{user['first_name']} {user['last_name']}",
            "email": user["email"],
            "organization": user["organization_name"],
            "assessment_count": assessment_count,
            "latest_assessment": latest_assessment["submission_date"] if latest_assessment else None,
            "status": user.get("status", "active")
        })
    
    return {
        "user_stats": {
            "total_users": total_users,
            "admin_users": admin_users,
            "regular_users": regular_users
        },
        "assessment_stats": {
            "total_assessments": total_assessments,
            "total_responses": total_responses,
            "average_responses_per_assessment": round(total_responses / total_assessments, 2) if total_assessments > 0 else 0
        },
        "recent_assessments": recent_assessments,
        "user_activities": user_activities
    }

# Admin Content Management
@api_router.get("/admin/content-stats")
async def get_content_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    domains_count = await db.domains.count_documents({})
    subdomains_count = await db.subdomains.count_documents({})
    controls_count = await db.controls.count_documents({})
    metrics_count = await db.metrics.count_documents({})
    questions_count = await db.questions.count_documents({})
    
    return {
        "domains": domains_count,
        "subdomains": subdomains_count,
        "controls": controls_count,
        "metrics": metrics_count,
        "questions": questions_count
    }

# Domains CRUD
@api_router.get("/admin/domains")
async def get_domains_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    domains = await db.domains.find().sort("order", 1).to_list(length=None)
    return domains

@api_router.post("/admin/domains")
async def create_domain(domain_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    domain_data["id"] = str(uuid.uuid4())
    await db.domains.insert_one(domain_data)
    return {"message": "Domain created successfully"}

@api_router.put("/admin/domains/{domain_id}")
async def update_domain(domain_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.domains.update_one({"id": domain_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Domain not found")
    return {"message": "Domain updated successfully"}

@api_router.delete("/admin/domains/{domain_id}")
async def delete_domain(domain_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.domains.delete_one({"id": domain_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Domain not found")
    return {"message": "Domain deleted successfully"}

# Subdomains CRUD  
@api_router.get("/admin/subdomains")
async def get_subdomains_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    subdomains = await db.subdomains.find().to_list(length=None)
    return subdomains

@api_router.post("/admin/subdomains")
async def create_subdomain(subdomain_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    subdomain_data["id"] = str(uuid.uuid4())
    await db.subdomains.insert_one(subdomain_data)
    return {"message": "Subdomain created successfully"}

@api_router.put("/admin/subdomains/{subdomain_id}")
async def update_subdomain(subdomain_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.subdomains.update_one({"id": subdomain_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subdomain not found")
    return {"message": "Subdomain updated successfully"}

@api_router.delete("/admin/subdomains/{subdomain_id}")
async def delete_subdomain(subdomain_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.subdomains.delete_one({"id": subdomain_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subdomain not found")
    return {"message": "Subdomain deleted successfully"}

# Controls CRUD
@api_router.get("/admin/controls")
async def get_controls_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    controls = await db.controls.find().to_list(length=None)
    return controls

@api_router.post("/admin/controls")
async def create_control(control_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    control_data["id"] = str(uuid.uuid4())
    await db.controls.insert_one(control_data)
    return {"message": "Control created successfully"}

@api_router.put("/admin/controls/{control_id}")
async def update_control(control_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.controls.update_one({"id": control_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Control not found")
    return {"message": "Control updated successfully"}

@api_router.delete("/admin/controls/{control_id}")
async def delete_control(control_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.controls.delete_one({"id": control_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Control not found")
    return {"message": "Control deleted successfully"}

# Metrics CRUD
@api_router.get("/admin/metrics")
async def get_metrics_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    metrics = await db.metrics.find().to_list(length=None)
    return metrics

@api_router.post("/admin/metrics")
async def create_metric(metric_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    metric_data["id"] = str(uuid.uuid4())
    await db.metrics.insert_one(metric_data)
    return {"message": "Metric created successfully"}

@api_router.put("/admin/metrics/{metric_id}")
async def update_metric(metric_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.metrics.update_one({"id": metric_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"message": "Metric updated successfully"}

@api_router.delete("/admin/metrics/{metric_id}")
async def delete_metric(metric_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.metrics.delete_one({"id": metric_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"message": "Metric deleted successfully"}

# Questions CRUD
@api_router.get("/admin/questions")
async def get_questions_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    questions = await db.questions.find().to_list(length=None)
    return questions

@api_router.post("/admin/questions")
async def create_question(question_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    question_data["id"] = str(uuid.uuid4())
    await db.questions.insert_one(question_data)
    return {"message": "Question created successfully"}

@api_router.put("/admin/questions/{question_id}")
async def update_question(question_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.questions.update_one({"id": question_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question updated successfully"}

@api_router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted successfully"}

# Admin Content Management - Domains
@api_router.get("/admin/domains", response_model=List[Domain])
async def get_domains_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    domains = await db.domains.find().sort("order", 1).to_list(length=None)
    return [Domain(**domain) for domain in domains]

@api_router.post("/admin/domains")
async def create_domain(domain: Domain, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.domains.insert_one(domain.dict())
    return {"message": "Domain created successfully"}

@api_router.put("/admin/domains/{domain_id}")
async def update_domain(domain_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.domains.update_one({"id": domain_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    return {"message": "Domain updated successfully"}

@api_router.delete("/admin/domains/{domain_id}")
async def delete_domain(domain_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Delete related data
    await db.questions.delete_many({"domain_id": domain_id})
    await db.subdomains.delete_many({"domain_id": domain_id})
    
    result = await db.domains.delete_one({"id": domain_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    return {"message": "Domain and related data deleted successfully"}

# Admin Content Management - Subdomains
@api_router.get("/admin/subdomains")
async def get_subdomains_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    subdomains = await db.subdomains.find().to_list(length=None)
    return subdomains

@api_router.post("/admin/subdomains")
async def create_subdomain(subdomain: SubDomain, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.subdomains.insert_one(subdomain.dict())
    return {"message": "Subdomain created successfully"}

@api_router.put("/admin/subdomains/{subdomain_id}")
async def update_subdomain(subdomain_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.subdomains.update_one({"id": subdomain_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subdomain not found")
    
    return {"message": "Subdomain updated successfully"}

@api_router.delete("/admin/subdomains/{subdomain_id}")
async def delete_subdomain(subdomain_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.subdomains.delete_one({"id": subdomain_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subdomain not found")
    
    return {"message": "Subdomain deleted successfully"}

# Admin Content Management - Controls
@api_router.get("/admin/controls")
async def get_controls_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    controls = await db.controls.find().to_list(length=None)
    return controls

@api_router.post("/admin/controls")
async def create_control(control: Control, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.controls.insert_one(control.dict())
    return {"message": "Control created successfully"}

@api_router.put("/admin/controls/{control_id}")
async def update_control(control_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.controls.update_one({"id": control_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Control not found")
    
    return {"message": "Control updated successfully"}

@api_router.delete("/admin/controls/{control_id}")
async def delete_control(control_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.controls.delete_one({"id": control_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Control not found")
    
    return {"message": "Control deleted successfully"}

# Admin Content Management - Questions
@api_router.get("/admin/questions")
async def get_questions_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    questions = await db.questions.find().to_list(length=None)
    return questions

@api_router.post("/admin/questions")
async def create_question(question: Question, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.questions.insert_one(question.dict())
    return {"message": "Question created successfully"}

@api_router.put("/admin/questions/{question_id}")
async def update_question(question_id: str, updates: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.questions.update_one({"id": question_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"message": "Question updated successfully"}

@api_router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"message": "Question deleted successfully"}

# Initialize sample data
@api_router.post("/admin/init-data")
async def initialize_sample_data():
    """Initialize the database with sample assessment data"""
    
    # Check if data already exists
    existing_domains = await db.domains.count_documents({})
    if existing_domains > 0:
        return {"message": "Data already initialized"}
    
    # Create sample domains
    domains = [
        {"id": str(uuid.uuid4()), "name": "Information Security Governance", "description": "Overall security governance and management", "icon": "🏛️", "order": 1},
        {"id": str(uuid.uuid4()), "name": "Access Control", "description": "User access and authentication controls", "icon": "🔐", "order": 2},
        {"id": str(uuid.uuid4()), "name": "Data Protection", "description": "Data security and privacy measures", "icon": "🛡️", "order": 3},
        {"id": str(uuid.uuid4()), "name": "Network Security", "description": "Network infrastructure security", "icon": "🌐", "order": 4},
        {"id": str(uuid.uuid4()), "name": "Incident Response", "description": "Security incident handling procedures", "icon": "🚨", "order": 5}
    ]
    
    await db.domains.insert_many(domains)
    
    # Create comprehensive sample data for ALL domains
    all_questions = []
    
    for domain_idx, domain in enumerate(domains):
        domain_id = domain["id"]
        
        # Create subdomains for each domain
        subdomains = []
        if domain["name"] == "Information Security Governance":
            subdomains = [
                {"id": str(uuid.uuid4()), "name": "Security Policies", "domain_id": domain_id},
                {"id": str(uuid.uuid4()), "name": "Risk Management", "domain_id": domain_id}
            ]
        elif domain["name"] == "Access Control":
            subdomains = [
                {"id": str(uuid.uuid4()), "name": "User Authentication", "domain_id": domain_id},
                {"id": str(uuid.uuid4()), "name": "Authorization Management", "domain_id": domain_id}
            ]
        elif domain["name"] == "Data Protection":
            subdomains = [
                {"id": str(uuid.uuid4()), "name": "Data Classification", "domain_id": domain_id},
                {"id": str(uuid.uuid4()), "name": "Data Encryption", "domain_id": domain_id}
            ]
        elif domain["name"] == "Network Security":
            subdomains = [
                {"id": str(uuid.uuid4()), "name": "Firewall Management", "domain_id": domain_id},
                {"id": str(uuid.uuid4()), "name": "Network Monitoring", "domain_id": domain_id}
            ]
        else:  # Incident Response
            subdomains = [
                {"id": str(uuid.uuid4()), "name": "Incident Detection", "domain_id": domain_id},
                {"id": str(uuid.uuid4()), "name": "Response Procedures", "domain_id": domain_id}
            ]
        
        await db.subdomains.insert_many(subdomains)
        
        # Create controls for each subdomain
        controls = []
        for subdomain in subdomains:
            if "Policies" in subdomain["name"] or "Authentication" in subdomain["name"] or "Classification" in subdomain["name"] or "Firewall" in subdomain["name"] or "Detection" in subdomain["name"]:
                control_name = f"{subdomain['name']} Framework"
                control_def = f"Established {subdomain['name'].lower()} framework and procedures"
            else:
                control_name = f"{subdomain['name']} Process"
                control_def = f"Systematic {subdomain['name'].lower()} process and controls"
            
            controls.append({
                "id": str(uuid.uuid4()),
                "name": control_name,
                "definition": control_def,
                "subdomain_id": subdomain["id"]
            })
        
        await db.controls.insert_many(controls)
        
        # Create metrics for each control
        metrics = []
        for control in controls:
            metrics.append({
                "id": str(uuid.uuid4()),
                "name": f"{control['name']} Effectiveness",
                "control_id": control["id"]
            })
        
        await db.metrics.insert_many(metrics)
        
        # Create questions for each domain
        domain_questions = []
        
        if domain["name"] == "Information Security Governance":
            domain_questions = [
                {
                    "question_text": "How comprehensive is your organization's information security policy framework?",
                    "subdomain_id": subdomains[0]["id"],
                    "control_id": controls[0]["id"],
                    "metric_id": metrics[0]["id"]
                },
                {
                    "question_text": "How frequently does your organization conduct risk assessments?",
                    "subdomain_id": subdomains[1]["id"], 
                    "control_id": controls[1]["id"],
                    "metric_id": metrics[1]["id"]
                }
            ]
        elif domain["name"] == "Access Control":
            domain_questions = [
                {
                    "question_text": "How robust is your multi-factor authentication implementation?",
                    "subdomain_id": subdomains[0]["id"],
                    "control_id": controls[0]["id"],
                    "metric_id": metrics[0]["id"]
                },
                {
                    "question_text": "How effectively does your organization manage user access permissions?",
                    "subdomain_id": subdomains[1]["id"],
                    "control_id": controls[1]["id"],
                    "metric_id": metrics[1]["id"]
                }
            ]
        elif domain["name"] == "Data Protection":
            domain_questions = [
                {
                    "question_text": "How comprehensive is your data classification scheme?",
                    "subdomain_id": subdomains[0]["id"],
                    "control_id": controls[0]["id"],
                    "metric_id": metrics[0]["id"]
                },
                {
                    "question_text": "How extensive is your data encryption coverage?",
                    "subdomain_id": subdomains[1]["id"],
                    "control_id": controls[1]["id"],
                    "metric_id": metrics[1]["id"]
                }
            ]
        elif domain["name"] == "Network Security":
            domain_questions = [
                {
                    "question_text": "How effective is your firewall configuration and management?",
                    "subdomain_id": subdomains[0]["id"],
                    "control_id": controls[0]["id"],
                    "metric_id": metrics[0]["id"]
                },
                {
                    "question_text": "How comprehensive is your network monitoring and detection capability?",
                    "subdomain_id": subdomains[1]["id"],
                    "control_id": controls[1]["id"],
                    "metric_id": metrics[1]["id"]
                }
            ]
        else:  # Incident Response
            domain_questions = [
                {
                    "question_text": "How effective is your incident detection and alerting system?",
                    "subdomain_id": subdomains[0]["id"],
                    "control_id": controls[0]["id"],
                    "metric_id": metrics[0]["id"]
                },
                {
                    "question_text": "How well-defined are your incident response procedures?",
                    "subdomain_id": subdomains[1]["id"],
                    "control_id": controls[1]["id"],
                    "metric_id": metrics[1]["id"]
                }
            ]
        
        # Add standard answers to each question
        for question_data in domain_questions:
            question = {
                "id": str(uuid.uuid4()),
                "question_text": question_data["question_text"],
                "domain_id": domain_id,
                "subdomain_id": question_data["subdomain_id"],
                "control_id": question_data["control_id"],
                "metric_id": question_data["metric_id"],
                "answers": [
                    {"id": str(uuid.uuid4()), "answer_text": "Not implemented or very poor", "score_value": 0},
                    {"id": str(uuid.uuid4()), "answer_text": "Basic implementation with significant gaps", "score_value": 1},
                    {"id": str(uuid.uuid4()), "answer_text": "Partially implemented covering key areas", "score_value": 2},
                    {"id": str(uuid.uuid4()), "answer_text": "Well implemented but needs improvement", "score_value": 3},
                    {"id": str(uuid.uuid4()), "answer_text": "Comprehensive implementation with regular reviews", "score_value": 4},
                    {"id": str(uuid.uuid4()), "answer_text": "Excellent implementation with continuous improvement", "score_value": 5}
                ]
            }
            all_questions.append(question)
    
    await db.questions.insert_many(all_questions)
    
    # Create default admin and test users
    default_users = [
        User(
            first_name="Admin",
            last_name="User", 
            organization_name="System",
            email="admin@secassess.com",
            designation="System Administrator",
            password_hash=hash_password("admin123"),
            role="admin"
        ),
        User(
            first_name="RKS",
            last_name="Admin",
            organization_name="Security Assessment",
            email="rks9454@gmail.com", 
            designation="Platform Administrator",
            password_hash=hash_password("admin123"),
            role="admin"
        ),
        User(
            first_name="Test",
            last_name="User",
            organization_name="Test Organization",
            email="testuser@example.com",
            designation="Security Analyst",
            password_hash=hash_password("user123"),
            role="user"
        )
    ]
    
    for user in default_users:
        await db.users.insert_one(user.dict())
    
    return {
        "message": "Complete sample data initialized successfully", 
        "domains_created": len(domains),
        "questions_per_domain": 2,
        "total_questions": len(all_questions),
        "users_created": len(default_users),
        "admin_credentials": [
            {"email": "admin@secassess.com", "password": "admin123"},
            {"email": "rks9454@gmail.com", "password": "admin123"}
        ],
        "test_user_credentials": {"email": "testuser@example.com", "password": "user123"}
    }

@api_router.post("/admin/clear-data")
async def clear_all_data():
    """Clear all data from database - USE WITH CAUTION"""
    try:
        # Clear all collections
        await db.domains.delete_many({})
        await db.subdomains.delete_many({})
        await db.controls.delete_many({})
        await db.metrics.delete_many({})
        await db.questions.delete_many({})
        await db.users.delete_many({})
        await db.user_assessments.delete_many({})
        await db.user_responses.delete_many({})
        
        return {"message": "All data cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing data: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()