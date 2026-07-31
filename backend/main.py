import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.rag_service import ingest_document, query_documents, list_documents, delete_document

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

app = FastAPI(title="CorpMind API", version="1.0.0")

DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]
FRONTEND_URL = os.getenv("FRONTEND_URL")
ALLOWED_ORIGINS = DEFAULT_ORIGINS + ([FRONTEND_URL] if FRONTEND_URL else [])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx", "doc"}


class ChatRequest(BaseModel):
    question: str


class AdminLoginRequest(BaseModel):
    password: str


def require_admin(x_admin_key: str = Header(default=None)):
    if not ADMIN_PASSWORD or x_admin_key != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized.")


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "CorpMind API running"}


# ─── Admin: Auth ────────────────────────────────────────────────────────────────

@app.post("/admin/login")
def admin_login(req: AdminLoginRequest):
    if not ADMIN_PASSWORD or req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect password.")
    return {"ok": True}


# ─── Admin: Document Management ────────────────────────────────────────────────

@app.post("/upload", dependencies=[Depends(require_admin)])
async def upload_document(file: UploadFile = File(...)):
    ext = file.filename.lower().rsplit(".", 1)[-1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type .{ext} not supported. Allowed: {sorted(ALLOWED_EXTENSIONS)}"
        )

    contents = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        result = ingest_document(tmp_path, file.filename)
        return {
            "message": f"'{file.filename}' uploaded and indexed successfully.",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)


@app.get("/documents", dependencies=[Depends(require_admin)])
def get_documents():
    try:
        files = list_documents()
        return {"documents": files, "count": len(files)}
    except Exception:
        return {"documents": [], "count": 0}


@app.delete("/documents/{filename}", dependencies=[Depends(require_admin)])
def remove_document(filename: str):
    try:
        result = delete_document(filename)
        return {"message": f"'{filename}' removed.", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Employee: Chat ─────────────────────────────────────────────────────────────

@app.post("/chat")
def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        result = query_documents(req.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
