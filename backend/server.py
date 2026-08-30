from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
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
    ("admin", "admin", "Administrator"),
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
    "tso_lokomotif": "TSO Lokomotif",
    "tso_kereta": "TSO Kereta",
    "tso_gerbong": "TSO Gerbong",
    "tsgo_lokomotif": "TSGO Lokomotif",
    "tsgo_kereta": "TSGO Kereta",
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
async def get_rekap(user: dict = Depends(get_current_user)):
    """Return all entries grouped by owner/region and category for text rendering on client."""
    query = {} if user["role"] == "admin" else {"owner": user["username"]}
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
    if user["role"] == "admin":
        keys_sorted = sorted(grouped.keys(), key=lambda k: ordered_owners.index(k.split("|")[0]) if k.split("|")[0] in ordered_owners else 999)
    else:
        keys_sorted = list(grouped.keys())

    for key in keys_sorted:
        owner, region = key.split("|", 1)
        cats = []
        for ckey, clabel in VALID_CATEGORIES.items():
            if ckey in grouped[key]:
                cats.append({"key": ckey, "label": clabel, "items": grouped[key][ckey]})
        result.append({"owner": owner, "region": region, "categories": cats})
    return {"groups": result, "generated_at": datetime.now(timezone.utc).isoformat()}


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
