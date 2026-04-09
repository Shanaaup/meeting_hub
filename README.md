# 🧠 Meeting Intelligence Hub

> AI-powered meeting analysis — upload transcripts, extract decisions & action items, analyze speaker sentiment, and chat with your meetings using RAG.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Multi-transcript Upload** | Drag-and-drop `.txt` / `.vtt` files with real-time progress |
| **Decision & Action Item Extraction** | GPT-4o powered NLP extraction with CSV/PDF export |
| **Sentiment Analysis** | Per-speaker and per-segment sentiment with visual timeline |
| **RAG Chatbot** | Ask natural-language questions, get cited answers from your meetings |
| **JWT Auth + RBAC** | Secure login/register with role-based access control |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- An **OpenAI API Key**

### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

App available at: **http://localhost:3000**

---

## 🐳 Docker (Full Stack)

```bash
# Copy env files
copy backend\.env.example backend\.env
# Edit backend\.env with your OPENAI_API_KEY

# Build and start all services
docker-compose up --build
```

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | *(required)* | Your OpenAI API key |
| `OPENAI_CHAT_MODEL` | `gpt-4o` | Chat model to use |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` | Embedding model |
| `SECRET_KEY` | *(change this!)* | JWT signing secret |
| `DATABASE_URL` | SQLite | DB connection string |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

---

## 📁 Project Structure

```
meeting_hub/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings
│   │   ├── database.py          # SQLAlchemy
│   │   ├── models/              # ORM models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API routes
│   │   │   ├── auth.py          # /auth/*
│   │   │   ├── meetings.py      # /meetings/*
│   │   │   ├── analysis.py      # /analysis/*
│   │   │   └── chat.py          # /chat/*
│   │   ├── services/
│   │   │   ├── nlp/
│   │   │   │   ├── extractor.py # Decision/action LLM extraction
│   │   │   │   ├── sentiment.py # Sentiment analysis
│   │   │   │   └── rag_chat.py  # RAG chatbot
│   │   │   ├── vector_store.py  # FAISS indexing
│   │   │   ├── file_service.py  # Transcript parsing
│   │   │   └── export_service.py# CSV/PDF export
│   │   └── middleware/auth.py   # JWT middleware
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       ├── components/          # Shared UI components
│       └── lib/                 # API client, auth, types
├── docker-compose.yml
└── README.md
```

---

## 🧪 API Reference

Full Swagger UI: **http://localhost:8000/docs**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get JWT |
| GET | `/meetings` | List all meetings |
| POST | `/meetings/upload` | Upload transcripts |
| POST | `/analysis/{id}/extract` | Run NLP extraction |
| POST | `/analysis/{id}/sentiment` | Run sentiment analysis |
| GET | `/analysis/{id}/export/csv` | Download CSV report |
| GET | `/analysis/{id}/export/pdf` | Download PDF report |
| POST | `/chat/query` | RAG chatbot query |
