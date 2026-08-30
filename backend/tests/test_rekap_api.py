"""Backend API tests for Rekap Cadangan KAI."""
import os
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://railway-data-recap.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
CATS = ["tso_lokomotif", "tso_kereta", "tso_gerbong", "tsgo_lokomotif", "tsgo_kereta", "tsgo_gerbong"]


def _login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=15)
    return r


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


@pytest.fixture(scope="module")
def user2_token():
    r = _login("Pusdal2", "pusdal123")
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# --- Auth ---
def test_login_wrong_password():
    r = _login("Pusdal1", "wrong")
    assert r.status_code == 401


def test_login_success_shape():
    r = _login("Pusdal1", "pusdal123")
    d = r.json()
    assert d["role"] == "user" and d["region"] == "Jakarta"
    assert d["username"] == "Pusdal1"
    assert "access_token" in d


def test_me_no_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_valid(user_token):
    r = requests.get(f"{API}/auth/me", headers=H(user_token))
    assert r.status_code == 200
    assert r.json()["username"] == "Pusdal1"


# --- Categories ---
def test_categories():
    r = requests.get(f"{API}/categories")
    assert r.status_code == 200
    keys = [c["key"] for c in r.json()]
    assert set(keys) == set(CATS)


# --- Entries CRUD ---
def test_create_invalid_category(user_token):
    r = requests.post(f"{API}/entries/bogus", json={"nomor": "X"}, headers=H(user_token))
    assert r.status_code == 400


def test_entries_full_flow(user_token, user2_token, admin_token):
    # create for Pusdal1
    r = requests.post(f"{API}/entries/tso_lokomotif",
                      json={"nomor": "TEST_CC201-01", "keterangan": "TEST_ket"},
                      headers=H(user_token))
    assert r.status_code == 200, r.text
    e1 = r.json()
    assert e1["owner"] == "Pusdal1" and e1["region"] == "Jakarta"

    # create for Pusdal2
    r2 = requests.post(f"{API}/entries/tso_lokomotif",
                       json={"nomor": "TEST_CC202-01"},
                       headers=H(user2_token))
    assert r2.status_code == 200
    e2 = r2.json()

    # list: Pusdal1 sees only own
    lst = requests.get(f"{API}/entries/tso_lokomotif", headers=H(user_token)).json()
    owners = {x["owner"] for x in lst}
    assert owners == {"Pusdal1"}

    # admin sees both
    adm = requests.get(f"{API}/entries/tso_lokomotif", headers=H(admin_token)).json()
    adm_owners = {x["owner"] for x in adm}
    assert {"Pusdal1", "Pusdal2"}.issubset(adm_owners)

    # Pusdal1 cannot update Pusdal2's entry -> 404
    upd = requests.put(f"{API}/entries/tso_lokomotif/{e2['id']}",
                       json={"nomor": "HACK"}, headers=H(user_token))
    assert upd.status_code == 404

    # own update ok
    upd_own = requests.put(f"{API}/entries/tso_lokomotif/{e1['id']}",
                           json={"nomor": "TEST_UPDATED"}, headers=H(user_token))
    assert upd_own.status_code == 200
    assert upd_own.json()["nomor"] == "TEST_UPDATED"

    # empty nomor rejected
    bad = requests.post(f"{API}/entries/tso_lokomotif", json={"nomor": "   "},
                        headers=H(user_token))
    assert bad.status_code == 400

    # rekap - user only sees own
    rekap = requests.get(f"{API}/rekap", headers=H(user_token)).json()
    assert all(g["owner"] == "Pusdal1" for g in rekap["groups"])

    # rekap - admin sees multiple owners
    ra = requests.get(f"{API}/rekap", headers=H(admin_token)).json()
    admin_owners = {g["owner"] for g in ra["groups"]}
    assert {"Pusdal1", "Pusdal2"}.issubset(admin_owners)
    # order preserved
    idxs = [["Pusdal1", "Pusdal2"].index(g["owner"]) for g in ra["groups"] if g["owner"] in ("Pusdal1", "Pusdal2")]
    assert idxs == sorted(idxs)

    # delete own
    dl = requests.delete(f"{API}/entries/tso_lokomotif/{e1['id']}", headers=H(user_token))
    assert dl.status_code == 200
    dl_verify = requests.delete(f"{API}/entries/tso_lokomotif/{e1['id']}", headers=H(user_token))
    assert dl_verify.status_code == 404

    # cleanup Pusdal2
    requests.delete(f"{API}/entries/tso_lokomotif/{e2['id']}", headers=H(user2_token))
