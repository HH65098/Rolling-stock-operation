from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_EXPIRE_MINUTES', '1440'))

# Preset accounts: (username, role, region_label)
SEED_USERS = [
    ("OPpusat", "admin", "Operasi Pusat"),
    ("Pusdal1", "user", "Jakarta"),
    ("Pusdal2", "user", "Bandung"),
    ("Pusdal3", "user", "Cirebon"),
    ("Pusdal4", "user", "Semarang"),
    ("Pusdal5", "user", "Purwokerto"),
    ("Pusdal6", "user", "Yogyakarta"),
    ("Pusdal7", "user", "Madiun"),
    ("Pusdal8", "user", "Surabaya"),
    ("Pusdal9", "user", "Jember"),
    ("PusdalV1", "user", "Medan"),
    ("PusdalV2", "user", "Padang"),
    ("PusdalSS", "user", "Sumatera Selatan"),
]

VALID_CATEGORIES = {
    "cadangan_lokomotif": "Cadangan Lokomotif",
    "tso_lokomotif": "TSO Lokomotif",
    "tsgo_lokomotif": "TSGO Lokomotif",
    "cadangan_kereta": "Cadangan Kereta",
    "tso_kereta": "TSO Kereta",
    "tsgo_kereta": "TSGO Kereta",
    "cadangan_gerbong": "Cadangan Gerbong",
    "tso_gerbong": "TSO Gerbong",
    "tsgo_gerbong": "TSGO Gerbong",
}

app = FastAPI()
api_router = APIRouter(prefix="/api")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ------------------- Models -------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    region: str


class UserView(BaseModel):
    username: str
    role: str
    region: str


class EntryCreate(BaseModel):
    nomor: str
    keterangan: str = ""


class EntryUpdate(BaseModel):
    nomor: Optional[str] = None
    keterangan: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class Entry(BaseModel):
    id: str
    category: str
    nomor: str
    keterangan: str
    owner: str
    region: str
    created_at: str
    updated_at: str


# ------------------- Helpers -------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def create_token(username: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesi tidak valid atau kadaluarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise unauthorized
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise unauthorized
    except InvalidTokenError:
        raise unauthorized
    user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0})
    if not user:
        raise unauthorized
    return user


def entry_to_view(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "category": doc["category"],
        "nomor": doc["nomor"],
        "keterangan": doc.get("keterangan", ""),
        "owner": doc["owner"],
        "region": doc.get("region", ""),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


# ------------------- Startup -------------------
@app.on_event("startup")
async def seed_users_startup():
    await db.users.create_index("username", unique=True)
    await db.entries.create_index([("owner", 1), ("category", 1)])

    # Migration: legacy admin username was "admin"; rename to "OPpusat" if needed
    legacy = await db.users.find_one({"username": "admin"})
    if legacy:
        exists = await db.users.find_one({"username": "OPpusat"})
        if not exists:
            await db.users.update_one(
                {"_id": legacy["_id"]},
                {"$set": {"username": "OPpusat", "region": "Operasi Pusat"}},
            )
            # also migrate any entries owned by the previous admin
            await db.entries.update_many({"owner": "admin"}, {"$set": {"owner": "OPpusat"}})
            logger.info("Migrated legacy admin → OPpusat")
        else:
            await db.users.delete_one({"_id": legacy["_id"]})
            logger.info("Removed legacy admin (OPpusat already exists)")

    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    seed_password = os.environ.get("SEED_PASSWORD", "pusdal123")
    for username, role, region in SEED_USERS:
        pwd = admin_password if role == "admin" else seed_password
        await db.users.update_one(
            {"username": username},
            {
                "$setOnInsert": {
                    "username": username,
                    "role": role,
                    "region": region,
                    "password_hash": hash_password(pwd),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )
    logger.info("Seed users ensured (%d accounts)", len(SEED_USERS))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ------------------- Routes -------------------
@api_router.get("/")
async def root():
    return {"message": "Rekap Cadangan KAI API"}


@api_router.get("/categories")
async def get_categories():
    return [{"key": k, "label": v} for k, v in VALID_CATEGORIES.items()]


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    token = create_token(user["username"], user["role"])
    return TokenResponse(
        access_token=token,
        username=user["username"],
        role=user["role"],
        region=user.get("region", ""),
    )


@api_router.get("/auth/me", response_model=UserView)
async def me(user: dict = Depends(get_current_user)):
    return UserView(username=user["username"], role=user["role"], region=user.get("region", ""))


@api_router.get("/entries/{category}", response_model=List[Entry])
async def list_entries(category: str, user: dict = Depends(get_current_user)):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    query = {"category": category}
    if user["role"] != "admin":
        query["owner"] = user["username"]
    docs = await db.entries.find(query, {"_id": 0}).sort("created_at", 1).to_list(10000)
    return [entry_to_view(d) for d in docs]


@api_router.post("/entries/{category}", response_model=Entry)
async def create_entry(category: str, body: EntryCreate, user: dict = Depends(get_current_user)):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    if not body.nomor.strip():
        raise HTTPException(status_code=400, detail="Nomor wajib diisi")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "category": category,
        "nomor": body.nomor.strip(),
        "keterangan": body.keterangan.strip(),
        "owner": user["username"],
        "region": user.get("region", ""),
        "created_at": now,
        "updated_at": now,
    }
    await db.entries.insert_one(doc)
    return entry_to_view(doc)


@api_router.put("/entries/{category}/{entry_id}", response_model=Entry)
async def update_entry(category: str, entry_id: str, body: EntryUpdate, user: dict = Depends(get_current_user)):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    query = {"id": entry_id, "category": category}
    if user["role"] != "admin":
        query["owner"] = user["username"]
    existing = await db.entries.find_one(query, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.nomor is not None:
        if not body.nomor.strip():
            raise HTTPException(status_code=400, detail="Nomor wajib diisi")
        update["nomor"] = body.nomor.strip()
    if body.keterangan is not None:
        update["keterangan"] = body.keterangan.strip()
    await db.entries.update_one({"id": entry_id}, {"$set": update})
    doc = await db.entries.find_one({"id": entry_id}, {"_id": 0})
    return entry_to_view(doc)


@api_router.delete("/entries/{category}/{entry_id}")
async def delete_entry(category: str, entry_id: str, user: dict = Depends(get_current_user)):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    query = {"id": entry_id, "category": category}
    if user["role"] != "admin":
        query["owner"] = user["username"]
    result = await db.entries.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"ok": True}


@api_router.get("/rekap")
async def get_rekap(
    user: dict = Depends(get_current_user),
    start_date: Optional[str] = Query(None, description="ISO date YYYY-MM-DD (inclusive)"),
    end_date: Optional[str] = Query(None, description="ISO date YYYY-MM-DD (inclusive)"),
):
    """Return all entries grouped by owner/region and category. ADMIN ONLY.

    Optional date range filter uses `created_at` field.
    """
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya administrator yang dapat mengakses rekap")

    query: dict = {}
    date_filter: dict = {}
    if start_date:
        try:
            datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="start_date harus format YYYY-MM-DD")
        date_filter["$gte"] = f"{start_date}T00:00:00+00:00"
    if end_date:
        try:
            datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="end_date harus format YYYY-MM-DD")
        date_filter["$lte"] = f"{end_date}T23:59:59.999999+00:00"
    if date_filter:
        query["created_at"] = date_filter

    docs = await db.entries.find(query, {"_id": 0}).sort([("owner", 1), ("category", 1), ("created_at", 1)]).to_list(100000)

    # Group: region -> category -> [entries]
    grouped: dict = {}
    for d in docs:
        region = d.get("region") or d.get("owner")
        owner = d["owner"]
        key = f"{owner}|{region}"
        grouped.setdefault(key, {})
        grouped[key].setdefault(d["category"], [])
        grouped[key][d["category"]].append({
            "nomor": d["nomor"],
            "keterangan": d.get("keterangan", ""),
        })

    result = []
    # Preserve seed order for admin view
    ordered_owners = [u[0] for u in SEED_USERS if u[1] == "user"]
    keys_sorted = sorted(
        grouped.keys(),
        key=lambda k: ordered_owners.index(k.split("|")[0]) if k.split("|")[0] in ordered_owners else 999,
    )

    for key in keys_sorted:
        owner, region = key.split("|", 1)
        cats = []
        for ckey, clabel in VALID_CATEGORIES.items():
            if ckey in grouped[key]:
                cats.append({"key": ckey, "label": clabel, "items": grouped[key][ckey]})
        result.append({"owner": owner, "region": region, "categories": cats})
    return {
        "groups": result,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "start_date": start_date,
        "end_date": end_date,
    }


@api_router.post("/auth/change-password")
async def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter")
    doc = await db.users.find_one({"username": user["username"]})
    if not doc or not verify_password(body.old_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    await db.users.update_one(
        {"username": user["username"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    return {"ok": True, "message": "Password berhasil diubah"}


@api_router.get("/activity/today")
async def activity_today(user: dict = Depends(get_current_user)):
    """Admin only. List Pusdal that added/edited data today, sorted by latest update."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya administrator yang dapat mengakses aktivitas")
    today = datetime.now(timezone.utc).date()
    start_iso = f"{today.isoformat()}T00:00:00+00:00"
    end_iso = f"{today.isoformat()}T23:59:59.999999+00:00"
    pipeline = [
        {"$match": {"updated_at": {"$gte": start_iso, "$lte": end_iso}}},
        {
            "$group": {
                "_id": "$owner",
                "region": {"$last": "$region"},
                "count": {"$sum": 1},
                "last_at": {"$max": "$updated_at"},
            }
        },
        {"$sort": {"last_at": -1}},
    ]
    rows = []
    async for doc in db.entries.aggregate(pipeline):
        rows.append({
            "owner": doc["_id"],
            "region": doc.get("region", ""),
            "count": doc.get("count", 0),
            "last_at": doc.get("last_at", ""),
        })
    # Also include Pusdal with zero activity today so admin can spot gaps
    active_owners = {r["owner"] for r in rows}
    inactive = []
    for username, role, region in SEED_USERS:
        if role != "user":
            continue
        if username not in active_owners:
            inactive.append({"owner": username, "region": region})
    return {"active": rows, "inactive": inactive, "date": today.isoformat()}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
