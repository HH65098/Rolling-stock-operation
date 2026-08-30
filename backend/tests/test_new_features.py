"""Backend tests for new features: change-password, activity/today, rekap date filter."""
import os
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"


def _login(u, p):
    return requests.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=15)


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin_token():
    r = _login("admin", "admin123")
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def user_token():
    r = _login("Pusdal1", "pusdal123")
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# --- Change Password ---
class TestChangePassword:
    def test_new_password_too_short(self, user_token):
        r = requests.post(
            f"{API}/auth/change-password",
            json={"old_password": "pusdal123", "new_password": "abc"},
            headers=H(user_token),
        )
        assert r.status_code == 400
        assert "minimal 6" in r.json()["detail"].lower() or "minimal" in r.json()["detail"].lower()

    def test_wrong_old_password(self, user_token):
        r = requests.post(
            f"{API}/auth/change-password",
            json={"old_password": "wrongpass", "new_password": "newpass123"},
            headers=H(user_token),
        )
        assert r.status_code == 400
        assert "lama" in r.json()["detail"].lower() or "salah" in r.json()["detail"].lower()

    def test_change_and_revert_roundtrip(self):
        # Use Pusdal9 to avoid disturbing other tests
        login1 = _login("Pusdal9", "pusdal123")
        assert login1.status_code == 200
        tok = login1.json()["access_token"]

        # Change
        r = requests.post(
            f"{API}/auth/change-password",
            json={"old_password": "pusdal123", "new_password": "newpass456"},
            headers=H(tok),
        )
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        # Old password should now fail
        bad = _login("Pusdal9", "pusdal123")
        assert bad.status_code == 401

        # New password works
        good = _login("Pusdal9", "newpass456")
        assert good.status_code == 200
        tok2 = good.json()["access_token"]

        # Revert
        r2 = requests.post(
            f"{API}/auth/change-password",
            json={"old_password": "newpass456", "new_password": "pusdal123"},
            headers=H(tok2),
        )
        assert r2.status_code == 200

        # Verify reverted
        final = _login("Pusdal9", "pusdal123")
        assert final.status_code == 200

    def test_no_auth(self):
        r = requests.post(
            f"{API}/auth/change-password",
            json={"old_password": "x", "new_password": "yyyyyy"},
        )
        assert r.status_code == 401


# --- Activity ---
class TestActivity:
    def test_regular_user_forbidden(self, user_token):
        r = requests.get(f"{API}/activity/today", headers=H(user_token))
        assert r.status_code == 403

    def test_admin_shape(self, admin_token):
        r = requests.get(f"{API}/activity/today", headers=H(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert "active" in data and isinstance(data["active"], list)
        assert "inactive" in data and isinstance(data["inactive"], list)
        assert "date" in data
        # date is today
        today = datetime.now(timezone.utc).date().isoformat()
        assert data["date"] == today
        # active items must have owner/region/count/last_at
        for row in data["active"]:
            assert "owner" in row and "region" in row and "count" in row and "last_at" in row
            assert isinstance(row["count"], int)
        for row in data["inactive"]:
            assert "owner" in row and "region" in row

    def test_admin_activity_reflects_new_entry(self, admin_token, user_token):
        # Create a fresh entry as Pusdal1 today
        r = requests.post(
            f"{API}/entries/tso_kereta",
            json={"nomor": "TEST_ACT_ENTRY", "keterangan": "activity"},
            headers=H(user_token),
        )
        assert r.status_code == 200
        eid = r.json()["id"]
        try:
            act = requests.get(f"{API}/activity/today", headers=H(admin_token)).json()
            owners_active = {a["owner"] for a in act["active"]}
            assert "Pusdal1" in owners_active
        finally:
            requests.delete(f"{API}/entries/tso_kereta/{eid}", headers=H(user_token))


# --- Rekap date filter ---
class TestRekapFilter:
    def test_invalid_start_date(self, admin_token):
        r = requests.get(
            f"{API}/rekap?start_date=2025-13-99", headers=H(admin_token)
        )
        assert r.status_code == 400

    def test_invalid_end_date(self, admin_token):
        r = requests.get(
            f"{API}/rekap?end_date=notadate", headers=H(admin_token)
        )
        assert r.status_code == 400

    def test_range_with_no_data_returns_empty_groups(self, admin_token):
        # Far past range - guaranteed no data
        r = requests.get(
            f"{API}/rekap?start_date=1990-01-01&end_date=1990-01-02",
            headers=H(admin_token),
        )
        assert r.status_code == 200
        d = r.json()
        assert d["groups"] == []
        assert d["start_date"] == "1990-01-01"
        assert d["end_date"] == "1990-01-02"

    def test_today_range_includes_new_entry(self, admin_token, user_token):
        r = requests.post(
            f"{API}/entries/cadangan_lokomotif",
            json={"nomor": "TEST_FILTER_ONE"},
            headers=H(user_token),
        )
        assert r.status_code == 200
        eid = r.json()["id"]
        try:
            today = datetime.now(timezone.utc).date().isoformat()
            rk = requests.get(
                f"{API}/rekap?start_date={today}&end_date={today}",
                headers=H(admin_token),
            )
            assert rk.status_code == 200
            data = rk.json()
            found = False
            for g in data["groups"]:
                for c in g["categories"]:
                    if any(it["nomor"] == "TEST_FILTER_ONE" for it in c["items"]):
                        found = True
            assert found, "TEST_FILTER_ONE should appear in today's filtered rekap"
        finally:
            requests.delete(f"{API}/entries/cadangan_lokomotif/{eid}", headers=H(user_token))

    def test_non_admin_still_blocked_with_dates(self, user_token):
        r = requests.get(
            f"{API}/rekap?start_date=2025-01-01&end_date=2025-12-31",
            headers=H(user_token),
        )
        assert r.status_code == 403
