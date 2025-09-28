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
        return {"total_responses": 0, "domains_completed": 0, "overall_average": 0}
    
    # Calculate stats
    total_responses = len(responses)
    total_score = sum(response["score_value"] for response in responses)
    overall_average = round(total_score / total_responses, 2) if total_responses > 0 else 0
    
    # Get unique domains completed
    domains_completed = len(set(response["domain_id"] for response in responses))
    
    return {
        "total_responses": total_responses,
        "domains_completed": domains_completed,
        "overall_average": overall_average,
        "submission_date": assessment["submission_date"]
    }

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
    
    # Create sample subdomains, controls, metrics, and questions for first domain
    domain_id = domains[0]["id"]
    
    # Sample subdomains
    subdomains = [
        {"id": str(uuid.uuid4()), "name": "Security Policies", "domain_id": domain_id},
        {"id": str(uuid.uuid4()), "name": "Risk Management", "domain_id": domain_id}
    ]
    await db.subdomains.insert_many(subdomains)
    
    # Sample controls
    controls = [
        {"id": str(uuid.uuid4()), "name": "Policy Framework", "definition": "Established security policies and procedures that govern organizational security practices", "subdomain_id": subdomains[0]["id"]},
        {"id": str(uuid.uuid4()), "name": "Risk Assessment", "definition": "Systematic process for identifying, analyzing, and evaluating security risks", "subdomain_id": subdomains[1]["id"]}
    ]
    await db.controls.insert_many(controls)
    
    # Sample metrics
    metrics = [
        {"id": str(uuid.uuid4()), "name": "Policy Coverage", "control_id": controls[0]["id"]},
        {"id": str(uuid.uuid4()), "name": "Risk Identification", "control_id": controls[1]["id"]}
    ]
    await db.metrics.insert_many(metrics)
    
    # Sample questions with answers
    questions = [
        {
            "id": str(uuid.uuid4()),
            "question_text": "How comprehensive is your organization's information security policy framework?",
            "domain_id": domain_id,
            "subdomain_id": subdomains[0]["id"],
            "control_id": controls[0]["id"],
            "metric_id": metrics[0]["id"],
            "answers": [
                {"id": str(uuid.uuid4()), "answer_text": "No formal security policies exist", "score_value": 0},
                {"id": str(uuid.uuid4()), "answer_text": "Basic security policies exist but are outdated", "score_value": 1},
                {"id": str(uuid.uuid4()), "answer_text": "Some security policies exist covering key areas", "score_value": 2},
                {"id": str(uuid.uuid4()), "answer_text": "Comprehensive policies exist but need regular updates", "score_value": 3},
                {"id": str(uuid.uuid4()), "answer_text": "Well-documented, current policies covering all areas", "score_value": 4},
                {"id": str(uuid.uuid4()), "answer_text": "Comprehensive, regularly updated policies with stakeholder input", "score_value": 5}
            ]
        },
        {
            "id": str(uuid.uuid4()),
            "question_text": "How frequently does your organization conduct risk assessments?",
            "domain_id": domain_id,
            "subdomain_id": subdomains[1]["id"],
            "control_id": controls[1]["id"],
            "metric_id": metrics[1]["id"],
            "answers": [
                {"id": str(uuid.uuid4()), "answer_text": "No formal risk assessments are conducted", "score_value": 0},
                {"id": str(uuid.uuid4()), "answer_text": "Risk assessments are conducted when issues arise", "score_value": 1},
                {"id": str(uuid.uuid4()), "answer_text": "Annual risk assessments are conducted", "score_value": 2},
                {"id": str(uuid.uuid4()), "answer_text": "Bi-annual risk assessments with some continuous monitoring", "score_value": 3},
                {"id": str(uuid.uuid4()), "answer_text": "Quarterly assessments with regular monitoring", "score_value": 4},
                {"id": str(uuid.uuid4()), "answer_text": "Continuous risk assessment with real-time monitoring", "score_value": 5}
            ]
        }
    ]
    
    await db.questions.insert_many(questions)
    
    # Create default admin user
    admin_user = User(
        first_name="Admin",
        last_name="User",
        organization_name="System",
        email="admin@secassess.com",
        designation="System Administrator",
        password_hash=hash_password("admin123"),
        role="admin"
    )
    
    await db.users.insert_one(admin_user.dict())
    
    return {"message": "Sample data initialized successfully", "admin_credentials": {"email": "admin@secassess.com", "password": "admin123"}}

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