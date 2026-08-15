from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_message_requires_auth():
    res = client.post("/chatbot/message", json={"message": "hola"})
    assert res.status_code == 401