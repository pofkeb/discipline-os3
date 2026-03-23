import pytest
import requests
import os

# Get backend URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL or EXPO_BACKEND_URL environment variable not set")
BASE_URL = BASE_URL.rstrip('/')

# ─── Health Check ───

class TestHealth:
    """Health endpoint tests"""
    
    def test_health_check(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health check passed")

# ─── Authentication ───

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_register_success(self, api_client):
        import uuid
        email = f"TEST_register_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": email,
            "password": "testpass123",
            "name": "Test Register User"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["name"] == payload["name"]
        assert data["user"]["subscription"] == "free"
        print(f"✓ Register successful for {email}")
    
    def test_register_duplicate_email(self, api_client):
        import uuid
        email = f"TEST_duplicate_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": email,
            "password": "testpass123",
            "name": "Test User"
        }
        # First registration
        response1 = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response1.status_code == 200
        
        # Duplicate registration
        response2 = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response2.status_code == 400
        print("✓ Duplicate email rejected")
    
    def test_login_success(self, api_client):
        import uuid
        email = f"TEST_login_{uuid.uuid4().hex[:8]}@test.com"
        password = "testpass123"
        # Register first
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": "Test Login User"
        })
        
        # Login
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == email.lower()
        print(f"✓ Login successful for {email}")
    
    def test_login_invalid_credentials(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")
    
    def test_get_me(self, api_client, auth_headers):
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "subscription" in data
        print("✓ Get current user successful")

# ─── Goals ───

class TestGoals:
    """Goal CRUD tests"""
    
    def test_create_goal_and_verify(self, api_client, auth_headers):
        payload = {
            "title": "TEST_Goal Learn Python",
            "description": "Master Python programming",
            "target_date": "2026-12-31"
        }
        response = api_client.post(f"{BASE_URL}/api/goals", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["description"] == payload["description"]
        assert data["target_date"] == payload["target_date"]
        assert "id" in data
        assert data["is_active"] == True
        assert data["milestones"] == []
        
        goal_id = data["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["title"] == payload["title"]
        print(f"✓ Goal created and verified: {goal_id}")
    
    def test_list_goals(self, api_client, auth_headers):
        response = api_client.get(f"{BASE_URL}/api/goals", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} goals")
    
    def test_update_goal(self, api_client, auth_headers):
        # Create goal
        create_response = api_client.post(f"{BASE_URL}/api/goals", json={
            "title": "TEST_Original Title",
            "description": "Original desc"
        }, headers=auth_headers)
        goal_id = create_response.json()["id"]
        
        # Update goal
        update_payload = {
            "title": "TEST_Updated Title",
            "description": "Updated desc",
            "target_date": "2027-01-01"
        }
        update_response = api_client.put(f"{BASE_URL}/api/goals/{goal_id}", json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Verify update
        get_response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        updated_data = get_response.json()
        assert updated_data["title"] == update_payload["title"]
        assert updated_data["description"] == update_payload["description"]
        print(f"✓ Goal updated: {goal_id}")
    
    def test_delete_goal(self, api_client, auth_headers):
        # Create goal
        create_response = api_client.post(f"{BASE_URL}/api/goals", json={
            "title": "TEST_Goal to Delete",
            "description": "Will be deleted"
        }, headers=auth_headers)
        goal_id = create_response.json()["id"]
        
        # Delete goal
        delete_response = api_client.delete(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/goals/{goal_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Goal deleted: {goal_id}")

# ─── Milestones ───

class TestMilestones:
    """Milestone tests"""
    
    def test_add_milestone(self, api_client, auth_headers):
        # Create goal
        goal_response = api_client.post(f"{BASE_URL}/api/goals", json={
            "title": "TEST_Goal with Milestones",
            "description": "Test milestones"
        }, headers=auth_headers)
        goal_id = goal_response.json()["id"]
        
        # Add milestone
        milestone_response = api_client.post(f"{BASE_URL}/api/goals/{goal_id}/milestones", json={
            "title": "TEST_Milestone 1"
        }, headers=auth_headers)
        assert milestone_response.status_code == 200
        
        data = milestone_response.json()
        assert len(data["milestones"]) == 1
        assert data["milestones"][0]["title"] == "TEST_Milestone 1"
        assert data["milestones"][0]["is_completed"] == False
        print(f"✓ Milestone added to goal {goal_id}")
    
    def test_toggle_milestone(self, api_client, auth_headers):
        # Create goal with milestone
        goal_response = api_client.post(f"{BASE_URL}/api/goals", json={
            "title": "TEST_Goal Toggle Milestone",
            "description": "Test toggle"
        }, headers=auth_headers)
        goal_id = goal_response.json()["id"]
        
        milestone_response = api_client.post(f"{BASE_URL}/api/goals/{goal_id}/milestones", json={
            "title": "TEST_Milestone Toggle"
        }, headers=auth_headers)
        milestone_id = milestone_response.json()["milestones"][0]["id"]
        
        # Toggle milestone to completed
        toggle_response = api_client.put(f"{BASE_URL}/api/goals/{goal_id}/milestones/{milestone_id}", headers=auth_headers)
        assert toggle_response.status_code == 200
        
        data = toggle_response.json()
        milestone = next(m for m in data["milestones"] if m["id"] == milestone_id)
        assert milestone["is_completed"] == True
        assert milestone["completed_at"] is not None
        
        # Toggle back to incomplete
        toggle_response2 = api_client.put(f"{BASE_URL}/api/goals/{goal_id}/milestones/{milestone_id}", headers=auth_headers)
        data2 = toggle_response2.json()
        milestone2 = next(m for m in data2["milestones"] if m["id"] == milestone_id)
        assert milestone2["is_completed"] == False
        print(f"✓ Milestone toggled: {milestone_id}")
    
    def test_delete_milestone(self, api_client, auth_headers):
        # Create goal with milestone
        goal_response = api_client.post(f"{BASE_URL}/api/goals", json={
            "title": "TEST_Goal Delete Milestone",
            "description": "Test delete"
        }, headers=auth_headers)
        goal_id = goal_response.json()["id"]
        
        milestone_response = api_client.post(f"{BASE_URL}/api/goals/{goal_id}/milestones", json={
            "title": "TEST_Milestone to Delete"
        }, headers=auth_headers)
        milestone_id = milestone_response.json()["milestones"][0]["id"]
        
        # Delete milestone
        delete_response = api_client.delete(f"{BASE_URL}/api/goals/{goal_id}/milestones/{milestone_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert len(data["milestones"]) == 0
        print(f"✓ Milestone deleted: {milestone_id}")

# ─── Tasks ───

class TestTasks:
    """Task CRUD tests"""
    
    def test_create_task_and_verify(self, api_client, auth_headers):
        payload = {"title": "TEST_Task Read for 30 minutes"}
        response = api_client.post(f"{BASE_URL}/api/tasks", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert "id" in data
        assert data["is_completed_today"] == False
        
        task_id = data["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        assert get_response.status_code == 200
        tasks = get_response.json()
        assert any(t["id"] == task_id for t in tasks)
        print(f"✓ Task created and verified: {task_id}")
    
    def test_list_tasks(self, api_client, auth_headers):
        response = api_client.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} tasks")
    
    def test_toggle_task(self, api_client, auth_headers):
        # Create task
        create_response = api_client.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task to Toggle"
        }, headers=auth_headers)
        task_id = create_response.json()["id"]
        
        # Toggle to completed
        toggle_response = api_client.post(f"{BASE_URL}/api/tasks/{task_id}/toggle", headers=auth_headers)
        assert toggle_response.status_code == 200
        
        data = toggle_response.json()
        assert data["is_completed"] == True
        
        # Toggle back to incomplete
        toggle_response2 = api_client.post(f"{BASE_URL}/api/tasks/{task_id}/toggle", headers=auth_headers)
        data2 = toggle_response2.json()
        assert data2["is_completed"] == False
        print(f"✓ Task toggled: {task_id}")
    
    def test_delete_task(self, api_client, auth_headers):
        # Create task
        create_response = api_client.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task to Delete"
        }, headers=auth_headers)
        task_id = create_response.json()["id"]
        
        # Delete task
        delete_response = api_client.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        tasks = get_response.json()
        assert not any(t["id"] == task_id for t in tasks)
        print(f"✓ Task deleted: {task_id}")

# ─── Reminders ───

class TestReminders:
    """Reminder CRUD tests"""
    
    def test_create_reminder_and_verify(self, api_client, auth_headers):
        payload = {
            "title": "TEST_Reminder Drink Water",
            "interval_type": "hours",
            "interval_value": 2
        }
        response = api_client.post(f"{BASE_URL}/api/reminders", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["interval_type"] == payload["interval_type"]
        assert data["interval_value"] == payload["interval_value"]
        assert "id" in data
        assert data["is_active"] == True
        
        reminder_id = data["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        assert get_response.status_code == 200
        reminders = get_response.json()
        assert any(r["id"] == reminder_id for r in reminders)
        print(f"✓ Reminder created and verified: {reminder_id}")
    
    def test_list_reminders(self, api_client, auth_headers):
        response = api_client.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} reminders")
    
    def test_update_reminder(self, api_client, auth_headers):
        # Create reminder
        create_response = api_client.post(f"{BASE_URL}/api/reminders", json={
            "title": "TEST_Original Reminder",
            "interval_type": "hours",
            "interval_value": 1
        }, headers=auth_headers)
        reminder_id = create_response.json()["id"]
        
        # Update reminder
        update_payload = {
            "title": "TEST_Updated Reminder",
            "interval_type": "daily",
            "interval_value": 1
        }
        update_response = api_client.put(f"{BASE_URL}/api/reminders/{reminder_id}", json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        
        data = update_response.json()
        assert data["title"] == update_payload["title"]
        assert data["interval_type"] == update_payload["interval_type"]
        print(f"✓ Reminder updated: {reminder_id}")
    
    def test_delete_reminder(self, api_client, auth_headers):
        # Create reminder
        create_response = api_client.post(f"{BASE_URL}/api/reminders", json={
            "title": "TEST_Reminder to Delete",
            "interval_type": "hours",
            "interval_value": 1
        }, headers=auth_headers)
        reminder_id = create_response.json()["id"]
        
        # Delete reminder
        delete_response = api_client.delete(f"{BASE_URL}/api/reminders/{reminder_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        reminders = get_response.json()
        assert not any(r["id"] == reminder_id for r in reminders)
        print(f"✓ Reminder deleted: {reminder_id}")

# ─── Stats ───

class TestStats:
    """Stats endpoint tests"""
    
    def test_get_stats(self, api_client, auth_headers):
        response = api_client.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "streak" in data
        assert "total_tasks" in data
        assert "total_completions" in data
        assert "today_completions" in data
        assert "total_goals" in data
        assert "total_milestones" in data
        assert "completed_milestones" in data
        assert "weekly_data" in data
        
        assert isinstance(data["streak"], int)
        assert isinstance(data["weekly_data"], list)
        assert len(data["weekly_data"]) == 7
        print("✓ Stats retrieved successfully")

# ─── Quotes ───

class TestQuotes:
    """Quote endpoint tests"""
    
    def test_get_daily_quote(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/quotes/daily")
        assert response.status_code == 200
        
        data = response.json()
        assert "text" in data
        assert "author" in data
        assert isinstance(data["text"], str)
        assert isinstance(data["author"], str)
        print(f"✓ Daily quote: '{data['text'][:50]}...'")
    
    def test_get_random_quote(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/quotes/random")
        assert response.status_code == 200
        
        data = response.json()
        assert "text" in data
        assert "author" in data
        print(f"✓ Random quote: '{data['text'][:50]}...'")
