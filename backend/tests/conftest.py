import pytest
import requests
import os

# Get backend URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL or EXPO_BACKEND_URL environment variable not set")
BASE_URL = BASE_URL.rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def test_user_token(api_client):
    """Create a test user and return auth token"""
    import uuid
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
    password = "testpass123"
    name = "Test User"
    
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    
    if response.status_code != 200:
        pytest.skip(f"Failed to create test user: {response.text}")
    
    data = response.json()
    return data['token']

@pytest.fixture
def auth_headers(test_user_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {test_user_token}"}
