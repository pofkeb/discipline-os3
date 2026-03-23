from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'discipline_os')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'discipline-os-secret-key-change-in-prod')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 168  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Helpers ───

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_str():
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

# ─── Pydantic Models ───

class RegisterInput(BaseModel):
    email: str
    password: str
    name: str

class LoginInput(BaseModel):
    email: str
    password: str

class GoalInput(BaseModel):
    title: str
    description: str = ''
    target_date: Optional[str] = None

class MilestoneInput(BaseModel):
    title: str

class TaskInput(BaseModel):
    title: str

class ReminderInput(BaseModel):
    title: str
    note: str = ''
    interval_type: str = 'hours'  # minutes, hours, specific
    interval_value: int = 1
    specific_time: Optional[str] = None

# ─── Auth Routes ───

@api_router.post("/auth/register")
async def register(input: RegisterInput):
    existing = await db.users.find_one({'email': input.email.lower()}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': input.email.lower(),
        'password_hash': hash_password(input.password),
        'name': input.name,
        'subscription': 'free',
        'created_at': now_iso()
    }
    await db.users.insert_one(user)
    token = create_token(user_id)
    return {
        'token': token,
        'user': {'id': user_id, 'email': user['email'], 'name': user['name'], 'subscription': user['subscription']}
    }

@api_router.post("/auth/login")
async def login(input: LoginInput):
    user = await db.users.find_one({'email': input.email.lower()}, {'_id': 0})
    if not user or not verify_password(input.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    token = create_token(user['id'])
    return {
        'token': token,
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'subscription': user['subscription']}
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {'id': user['id'], 'email': user['email'], 'name': user['name'], 'subscription': user.get('subscription', 'free')}

# ─── Goals Routes ───

@api_router.get("/goals")
async def list_goals(user=Depends(get_current_user)):
    goals = await db.goals.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return goals

@api_router.post("/goals")
async def create_goal(input: GoalInput, user=Depends(get_current_user)):
    goal_id = str(uuid.uuid4())
    goal = {
        'id': goal_id,
        'user_id': user['id'],
        'title': input.title,
        'description': input.description,
        'target_date': input.target_date,
        'is_active': True,
        'milestones': [],
        'created_at': now_iso()
    }
    await db.goals.insert_one(goal)
    goal.pop('_id', None)
    return goal

@api_router.get("/goals/{goal_id}")
async def get_goal(goal_id: str, user=Depends(get_current_user)):
    goal = await db.goals.find_one({'id': goal_id, 'user_id': user['id']}, {'_id': 0})
    if not goal:
        raise HTTPException(status_code=404, detail='Goal not found')
    return goal

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, input: GoalInput, user=Depends(get_current_user)):
    result = await db.goals.update_one(
        {'id': goal_id, 'user_id': user['id']},
        {'$set': {'title': input.title, 'description': input.description, 'target_date': input.target_date}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Goal not found')
    goal = await db.goals.find_one({'id': goal_id}, {'_id': 0})
    return goal

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user=Depends(get_current_user)):
    result = await db.goals.delete_one({'id': goal_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Goal not found')
    return {'success': True}

@api_router.post("/goals/{goal_id}/milestones")
async def add_milestone(goal_id: str, input: MilestoneInput, user=Depends(get_current_user)):
    milestone = {
        'id': str(uuid.uuid4()),
        'title': input.title,
        'is_completed': False,
        'completed_at': None,
        'order': 0
    }
    result = await db.goals.update_one(
        {'id': goal_id, 'user_id': user['id']},
        {'$push': {'milestones': milestone}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Goal not found')
    goal = await db.goals.find_one({'id': goal_id}, {'_id': 0})
    return goal

@api_router.put("/goals/{goal_id}/milestones/{milestone_id}")
async def toggle_milestone(goal_id: str, milestone_id: str, user=Depends(get_current_user)):
    goal = await db.goals.find_one({'id': goal_id, 'user_id': user['id']}, {'_id': 0})
    if not goal:
        raise HTTPException(status_code=404, detail='Goal not found')
    for m in goal.get('milestones', []):
        if m['id'] == milestone_id:
            m['is_completed'] = not m['is_completed']
            m['completed_at'] = now_iso() if m['is_completed'] else None
            break
    await db.goals.update_one({'id': goal_id}, {'$set': {'milestones': goal['milestones']}})
    goal = await db.goals.find_one({'id': goal_id}, {'_id': 0})
    return goal

@api_router.delete("/goals/{goal_id}/milestones/{milestone_id}")
async def delete_milestone(goal_id: str, milestone_id: str, user=Depends(get_current_user)):
    result = await db.goals.update_one(
        {'id': goal_id, 'user_id': user['id']},
        {'$pull': {'milestones': {'id': milestone_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Goal not found')
    goal = await db.goals.find_one({'id': goal_id}, {'_id': 0})
    return goal

# ─── Tasks Routes ───

@api_router.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    tasks = await db.tasks.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    date = today_str()
    completions = await db.task_completions.find({'user_id': user['id'], 'date': date}, {'_id': 0}).to_list(100)
    completed_ids = {c['task_id'] for c in completions}
    for t in tasks:
        t['is_completed_today'] = t['id'] in completed_ids
    return tasks

@api_router.post("/tasks")
async def create_task(input: TaskInput, user=Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    task = {
        'id': task_id,
        'user_id': user['id'],
        'title': input.title,
        'created_at': now_iso()
    }
    await db.tasks.insert_one(task)
    task.pop('_id', None)
    task['is_completed_today'] = False
    return task

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    result = await db.tasks.delete_one({'id': task_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Task not found')
    await db.task_completions.delete_many({'task_id': task_id})
    return {'success': True}

@api_router.post("/tasks/{task_id}/toggle")
async def toggle_task(task_id: str, user=Depends(get_current_user)):
    task = await db.tasks.find_one({'id': task_id, 'user_id': user['id']}, {'_id': 0})
    if not task:
        raise HTTPException(status_code=404, detail='Task not found')
    date = today_str()
    existing = await db.task_completions.find_one({'task_id': task_id, 'user_id': user['id'], 'date': date}, {'_id': 0})
    if existing:
        await db.task_completions.delete_one({'task_id': task_id, 'user_id': user['id'], 'date': date})
        return {'is_completed': False}
    else:
        completion = {
            'id': str(uuid.uuid4()),
            'task_id': task_id,
            'user_id': user['id'],
            'date': date,
            'completed_at': now_iso()
        }
        await db.task_completions.insert_one(completion)
        return {'is_completed': True}

# ─── Reminders Routes ───

@api_router.get("/reminders")
async def list_reminders(user=Depends(get_current_user)):
    reminders = await db.reminders.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return reminders

@api_router.post("/reminders")
async def create_reminder(input: ReminderInput, user=Depends(get_current_user)):
    reminder_id = str(uuid.uuid4())
    reminder = {
        'id': reminder_id,
        'user_id': user['id'],
        'title': input.title,
        'note': input.note,
        'interval_type': input.interval_type,
        'interval_value': input.interval_value,
        'specific_time': input.specific_time,
        'is_active': True,
        'created_at': now_iso()
    }
    await db.reminders.insert_one(reminder)
    reminder.pop('_id', None)
    return reminder

@api_router.put("/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, input: ReminderInput, user=Depends(get_current_user)):
    result = await db.reminders.update_one(
        {'id': reminder_id, 'user_id': user['id']},
        {'$set': {
            'title': input.title,
            'note': input.note,
            'interval_type': input.interval_type,
            'interval_value': input.interval_value,
            'specific_time': input.specific_time
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Reminder not found')
    reminder = await db.reminders.find_one({'id': reminder_id}, {'_id': 0})
    return reminder

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user=Depends(get_current_user)):
    result = await db.reminders.delete_one({'id': reminder_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Reminder not found')
    return {'success': True}

@api_router.post("/reminders/{reminder_id}/toggle")
async def toggle_reminder_active(reminder_id: str, user=Depends(get_current_user)):
    reminder = await db.reminders.find_one({'id': reminder_id, 'user_id': user['id']}, {'_id': 0})
    if not reminder:
        raise HTTPException(status_code=404, detail='Reminder not found')
    new_state = not reminder.get('is_active', True)
    await db.reminders.update_one({'id': reminder_id}, {'$set': {'is_active': new_state}})
    return {'is_active': new_state}

# ─── Stats Routes ───

@api_router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    # Total tasks
    total_tasks = await db.tasks.count_documents({'user_id': user['id']})
    # Total completions
    total_completions = await db.task_completions.count_documents({'user_id': user['id']})
    # Today's completions
    today_completions = await db.task_completions.count_documents({'user_id': user['id'], 'date': today_str()})
    # Goals
    total_goals = await db.goals.count_documents({'user_id': user['id']})
    # Milestones completed
    goals = await db.goals.find({'user_id': user['id']}, {'_id': 0, 'milestones': 1}).to_list(100)
    total_milestones = 0
    completed_milestones = 0
    for g in goals:
        for m in g.get('milestones', []):
            total_milestones += 1
            if m.get('is_completed'):
                completed_milestones += 1

    # Streak calculation
    streak = 0
    check_date = datetime.now(timezone.utc).date()
    for _ in range(365):
        date_str = check_date.strftime('%Y-%m-%d')
        count = await db.task_completions.count_documents({'user_id': user['id'], 'date': date_str})
        if count > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    # Last 7 days completion data
    weekly_data = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime('%Y-%m-%d')
        count = await db.task_completions.count_documents({'user_id': user['id'], 'date': d})
        weekly_data.append({'date': d, 'count': count})

    return {
        'streak': streak,
        'total_tasks': total_tasks,
        'total_completions': total_completions,
        'today_completions': today_completions,
        'total_goals': total_goals,
        'total_milestones': total_milestones,
        'completed_milestones': completed_milestones,
        'weekly_data': weekly_data
    }

# ─── Quotes ───

QUOTES = [
    {"text": "Discipline is the bridge between goals and accomplishment.", "author": "Jim Rohn"},
    {"text": "We do not rise to the level of our goals. We fall to the level of our systems.", "author": "James Clear"},
    {"text": "The secret of getting ahead is getting started.", "author": "Mark Twain"},
    {"text": "It's not about motivation. It's about discipline.", "author": "Unknown"},
    {"text": "Small disciplines repeated with consistency every day lead to great achievements.", "author": "John C. Maxwell"},
    {"text": "Success is nothing more than a few simple disciplines, practiced every day.", "author": "Jim Rohn"},
    {"text": "You will never always be motivated. You have to learn to be disciplined.", "author": "Unknown"},
    {"text": "The pain of discipline is nothing like the pain of disappointment.", "author": "Justin Langer"},
    {"text": "Motivation gets you going, but discipline keeps you growing.", "author": "John C. Maxwell"},
    {"text": "Do what needs to be done, when it needs to be done, whether you feel like it or not.", "author": "Unknown"},
    {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
    {"text": "What you do today can improve all your tomorrows.", "author": "Ralph Marston"},
    {"text": "Don't watch the clock; do what it does. Keep going.", "author": "Sam Levenson"},
    {"text": "Hard work beats talent when talent doesn't work hard.", "author": "Tim Notke"},
    {"text": "The difference between ordinary and extraordinary is that little extra.", "author": "Jimmy Johnson"},
    {"text": "Champions keep playing until they get it right.", "author": "Billie Jean King"},
    {"text": "Discipline is choosing between what you want now and what you want most.", "author": "Abraham Lincoln"},
    {"text": "Rome wasn't built in a day, but they were laying bricks every hour.", "author": "John Heywood"},
    {"text": "The future depends on what you do today.", "author": "Mahatma Gandhi"},
    {"text": "First we make our habits, then our habits make us.", "author": "Charles C. Noble"},
    {"text": "Consistency is what transforms average into excellence.", "author": "Unknown"},
    {"text": "Be stronger than your excuses.", "author": "Unknown"},
    {"text": "The only person you are destined to become is the person you decide to be.", "author": "Ralph Waldo Emerson"},
    {"text": "You don't have to be extreme, just consistent.", "author": "Unknown"},
    {"text": "One percent better every day.", "author": "James Clear"},
    {"text": "Suffer the pain of discipline or suffer the pain of regret.", "author": "Jim Rohn"},
    {"text": "Your habits will determine your future.", "author": "Jack Canfield"},
    {"text": "Greatness is a lot of small things done well, stacked on top of each other.", "author": "Ray Lewis"},
    {"text": "The best time to plant a tree was 20 years ago. The second best time is now.", "author": "Chinese Proverb"},
    {"text": "Action is the foundational key to all success.", "author": "Pablo Picasso"},
]

@api_router.get("/quotes/daily")
async def get_daily_quote():
    day_of_year = datetime.now(timezone.utc).timetuple().tm_yday
    idx = day_of_year % len(QUOTES)
    return QUOTES[idx]

@api_router.get("/quotes/random")
async def get_random_quote():
    return random.choice(QUOTES)

# ─── Health ───

@api_router.get("/health")
async def health():
    return {"status": "ok"}

# Include router & middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
