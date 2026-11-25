from tests.helpers import PASSWORD


def signup(client, **overrides):
    body = {"name": "Asha", "email": "Asha@Example.com", "password": PASSWORD, "role": "teacher"}
    return client.post("/auth/signup", json={**body, **overrides})


def test_signup_and_login(client):
    assert signup(client).status_code == 201

    response = client.post("/auth/login", json={"email": "asha@example.com", "password": PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["user"] == {**body["user"], "name": "Asha", "email": "asha@example.com", "role": "teacher"}

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["email"] == "asha@example.com"


def test_email_is_unique_ignoring_case(client):
    signup(client)
    response = signup(client, email="ASHA@example.com")
    assert response.status_code == 409


def test_signup_validation(client):
    assert signup(client, password="short").status_code == 422
    assert signup(client, role="admin").status_code == 422
    assert signup(client, email="not-an-email").status_code == 422


def test_login_failures_look_the_same(client):
    signup(client)
    wrong_password = client.post("/auth/login", json={"email": "asha@example.com", "password": "nope12345"})
    unknown_email = client.post("/auth/login", json={"email": "who@example.com", "password": "nope12345"})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_protected_routes_need_a_valid_token(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401
    assert client.get("/exams").status_code == 401
