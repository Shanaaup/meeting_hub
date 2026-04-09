# 🧠 Meeting Intelligence Hub

> AI-powered meeting analysis platform — upload transcripts, extract decisions & action items, analyze sentiment, and query across meetings with RAG-powered chat.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **📤 Multi-Transcript Ingestion** | Drag-and-drop upload for `.txt` and `.vtt` files with metadata extraction |
| **🎯 Decision & Action Extractor** | LLM-powered extraction of decisions, action items with who/what/when |
| **💬 RAG Chatbot** | Contextual Q&A across meetings with citations (speaker, timestamp) |
| **📊 Sentiment Analysis** | Per-speaker sentiment scoring with interactive timeline visualization |
| **📥 Export Reports** | Download CSV and PDF summaries of extracted insights |
| **🔐 JWT Authentication** | Secure user auth with role-based access control |
| **🐳 Docker Ready** | Full Docker Compose setup for one-command deployment |

---

## 🏗️ Architecture

```
meeting_hub/
├── backend/                  # FastAPI + Python NLP
│   ├── app/
│   │   ├── main.py           # Application entry point
│   │   ├── config.py         # Environment configuration
│   │   ├── database.py       # Async SQLAlchemy setup
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   │   ├── auth.py       # JWT register/login/me
│   │   │   ├── meetings.py   # Upload, list, detail, delete
│   │   │   ├── analysis.py   # Extract, sentiment, export
│   │   │   └── chat.py       # RAG chatbot queries
│   │   ├── services/
│   │   │   ├── file_service.py    # Transcript parsing
│   │   │   ├── vector_store.py    # FAISS vector index
│   │   │   ├── export_service.py  # CSV/PDF generation
│   │   │   └── nlp/
│   │   │       ├── extractor.py   # LLM decision/action extraction
│   │   │       ├── sentiment.py   # TextBlob sentiment analysis
│   │   │       └── rag_chat.py    # RAG Q&A pipeline
│   │   └── middleware/
│   │       └── auth.py       # JWT verification middleware
│   ├── scripts/
│   │   └── seed_demo.py      # Demo data seeder
│   ├── tests/
│   │   └── test_core.py      # Unit tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Next.js 14 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Home redirect
│   │   │   ├── globals.css          # Design system
│   │   │   ├── auth/login/          # Login page
│   │   │   ├── auth/register/       # Register page
│   │   │   ├── dashboard/           # Dashboard with stats
│   │   │   ├── upload/              # Drag-n-drop upload
│   │   │   ├── meetings/[id]/       # Meeting detail + tabs
│   │   │   └── chat/                # Cross-meeting chat
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   └── AppLayout.tsx        # Authentication wrapper
│   │   └── lib/
│   │       ├── api.ts               # Axios API client
│   │       ├── types.ts             # TypeScript interfaces
│   │       └── auth-context.tsx     # Auth state management
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.11
- **OpenAI API Key** (for LLM features)

### 1. Clone & Setup Environment

```bash
git clone <repo-url> meeting_hub
cd meeting_hub
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY

# Seed demo data
python -m scripts.seed_demo

# Start server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 4. Open the App

Navigate to **http://localhost:3000** and login with:
- **Email:** `demo@meetinghub.ai`
- **Password:** `demo1234`

---

## 🐳 Docker Deployment

```bash
# Build and run all services
docker compose up --build -d

# View logs
docker compose logs -f
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key | `dev-secret-key...` |
| `DATABASE_URL` | Database connection string | SQLite (dev) |
| `OPENAI_API_KEY` | OpenAI API key for LLM features | Required |
| `OPENAI_CHAT_MODEL` | Chat completion model | `gpt-4o` |
| `OPENAI_EMBED_MODEL` | Embedding model | `text-embedding-3-small` |
| `UPLOAD_DIR` | File upload storage path | `./data/uploads` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |

---

## 📚 API Documentation

With the backend running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login & get JWT |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/meetings/upload` | Upload transcript files |
| `GET` | `/meetings` | List user meetings |
| `GET` | `/meetings/{id}` | Get meeting details |
| `POST` | `/analysis/{id}/extract` | Extract decisions & actions |
| `POST` | `/analysis/{id}/sentiment` | Run sentiment analysis |
| `GET` | `/analysis/{id}/export/csv` | Export CSV report |
| `GET` | `/analysis/{id}/export/pdf` | Export PDF report |
| `POST` | `/chat/query` | RAG chatbot query |

---

## 🧪 Testing

```bash
cd backend
pytest tests/ -v
```

---

## 🔄 AI/ML Pipeline

```
Upload (.txt/.vtt)
    ↓
Parse & Extract Metadata
    ↓
┌──────────────────────┐
│  LLM Extraction      │ → Decisions + Action Items → DB
│  (OpenAI GPT-4o)     │
└──────────────────────┘
    ↓
┌──────────────────────┐
│  Sentiment Analysis  │ → Speaker Scores → DB
│  (TextBlob)          │
└──────────────────────┘
    ↓
┌──────────────────────┐
│  Vector Embedding    │ → FAISS Index
│  (text-embedding)    │
└──────────────────────┘
    ↓
┌──────────────────────┐
│  RAG Chatbot         │ → Retrieve → Reason → Answer + Citations
│  (FAISS + GPT-4o)    │
└──────────────────────┘
```

---

## 📄 License

MIT
