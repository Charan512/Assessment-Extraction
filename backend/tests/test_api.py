import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_create_session(client):
    response = client.post("/api/v1/upload/session")
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
