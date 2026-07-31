# CorpMind

RAG-based internal HR chatbot for SMEs. HR admins upload documents; employees ask questions; the AI answers only from those documents, citing sources.

**Demo context**: Built for MiyuPay, a fictional Singapore-based fintech payments and digital wallet startup (~100-300 staff). Demo HR policy documents (PTO, benefits, code of conduct, onboarding) are MOM/CPF-compliant Singapore policies.

## Why this stack

FastAPI was chosen for its async support and fast iteration speed for a solo-built API. LangChain handles the RAG orchestration (chunking, retrieval, prompt assembly) so the ingest/query pipeline doesn't need to be built from scratch. Pinecone was picked over a local vector store for a managed, zero-maintenance index that plugs directly into a deployed backend on Render without needing persistent disk. React + Vite keeps the frontend lightweight for a two-page app (chat + admin).

## Stack

- **Backend**: FastAPI + LangChain + Pinecone + GPT-4o mini
- **Frontend**: React + Vite
- **Deploy target**: Vercel (frontend) + Render (backend) + Pinecone (vector DB)

---

## Data Privacy

Uploaded document content and chat questions are sent to OpenAI's API (embeddings + `gpt-4o-mini`) to power the RAG pipeline. Under OpenAI's API terms (distinct from the consumer ChatGPT product):

- Data submitted via the API is **not used to train OpenAI's models**.
- API inputs and outputs are retained for up to 30 days by default for abuse monitoring, then deleted.

This is standard practice for RAG applications built on OpenAI's API, but it is not equivalent to a fully private, on-premise deployment. For a company like MiyuPay handling sensitive employee and financial data, a few directions worth being aware of (not commitments for this project):

- Requesting Zero Data Retention (ZDR) from OpenAI for eligible endpoints, or
- Using Azure OpenAI Service to keep model calls within the company's own cloud tenant, or
- A natural next step, if fully air-gapped inference were ever required, would be swapping in a self-hosted model via Ollama (e.g. Llama 3.1 8B or Mistral).

Admin document management is protected by a single shared password (`ADMIN_PASSWORD`) — sufficient for a portfolio/demo, but not a substitute for per-user accounts, roles, or audit logging in a production system.

---

## Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

cp .env.example .env
# Add your OpenAI API key, Pinecone API key, and choose an admin password in .env

uvicorn main:app --reload
```

Required environment variables (see `.env.example`):

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for embeddings + chat |
| `PINECONE_API_KEY` | Pinecone API key (free tier works) |
| `PINECONE_INDEX_NAME` | Pinecone index name (auto-created if it doesn't exist) |
| `ADMIN_PASSWORD` | Password required to log in to `/admin` |
| `FRONTEND_URL` | Deployed frontend origin (e.g. Vercel URL), added to CORS allowlist. Leave unset for local dev. |

Backend runs at `http://localhost:8000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

For local dev, no `.env` is needed — Vite's dev-server proxy forwards `/api` to `http://localhost:8000`. When deploying (e.g., to Vercel), set `VITE_API_URL` to your deployed backend URL — see `frontend/.env.example`.

---

## Usage

- Go to `/admin` and log in with `ADMIN_PASSWORD` to upload HR documents (PDF, DOCX, TXT)
- Go to `/` (Employee Chat) to ask questions — no login required
- The chatbot answers only from uploaded documents and cites its sources

---

## Project Structure

```
corpmind/
├── backend/
│   ├── main.py                  # FastAPI routes
│   ├── requirements.txt
│   ├── .env.example
│   └── services/
│       └── rag_service.py       # RAG logic (ingest, query, delete)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx              # Router + nav
│       └── pages/
│           ├── ChatPage.jsx     # Employee chat UI
│           └── AdminPage.jsx    # Admin login + document upload UI
└── (vector store lives in Pinecone, not local disk)
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/` | — | Health check |
| POST | `/admin/login` | — | Validate admin password |
| POST | `/upload` | Admin | Upload + index a document |
| GET | `/documents` | Admin | List indexed documents |
| DELETE | `/documents/{filename}` | Admin | Remove document from index |
| POST | `/chat` | — | Ask a question |

Admin-only routes require an `X-Admin-Key` header matching `ADMIN_PASSWORD`. The `/admin` frontend page handles this automatically after login (stored in the browser's localStorage).
