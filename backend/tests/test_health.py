from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok_and_request_id() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-ID"]


def test_health_preserves_request_id_header() -> None:
    client = TestClient(create_app())

    response = client.get("/health", headers={"X-Request-ID": "test-request-id"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-request-id"


def test_root_returns_app_name_and_status() -> None:
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"name": "Pocket Ledger AI", "status": "ok"}
