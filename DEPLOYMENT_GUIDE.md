# 🚀 MediAssist AI — Production Deployment & Vercel Guide

Welcome to the **MediAssist AI** deployment guide. This document provides step-by-step instructions for deploying both the **React + Vite Frontend** and the **FastAPI Python Backend** to **Vercel** as well as alternative production platforms (Render, Railway, Fly.io).

---

## 📦 Project Structure Overview

```text
├── api/
│   └── index.py                    # Vercel Serverless Function entrypoint (FastAPI)
├── backend/
│   ├── app/
│   │   ├── api/                    # API endpoints (Auth, Documents, Diet, Trends, Chat, etc.)
│   │   ├── core/                   # Config, Database, Security
│   │   ├── db/                     # Models, Initializers
│   │   └── services/               # Clinical RAG, Parser, RxNorm, NIDDK Diet Engine
│   ├── mediassist.db               # SQLite database with indexed medical data
│   ├── requirements.txt            # Python backend dependencies
│   └── tests/                      # Automated test suites
├── frontend/
│   ├── src/
│   │   ├── components/             # UI Components, Modals, Navbar, Sidebar
│   │   ├── views/                  # Dashboard, Reports, Workspace, Trends, Diet, Chat
│   │   ├── services/api.ts         # Environment-aware API client
│   │   └── types/                  # TypeScript interface definitions
│   ├── package.json
│   └── vite.config.ts
├── vercel.json                     # Full-stack Vercel deployment orchestration
├── requirements.txt                # Root Python dependencies for Vercel
├── .env.example                    # Environment variables template
└── README.md
```

---

## ⚡ Option 1: Full-Stack Monorepo Deployment on Vercel (Recommended)

This project is pre-configured with `vercel.json` and `api/index.py` so that **both the React frontend and FastAPI backend deploy simultaneously into a single Vercel project**.

### Step 1: Push Code to GitHub / GitLab / Bitbucket
1. Initialize a git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit of MediAssist AI"
   ```
2. Create a new repository on [GitHub](https://github.com/new) and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/mediassist-ai.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** → **"Project"**.
3. Select your `mediassist-ai` GitHub repository and click **Import**.

### Step 3: Configure Project Settings on Vercel
* **Framework Preset:** `Vite` (or `Other`)
* **Root Directory:** `./` (leave default)
* **Build Command:** `cd frontend && npm install && npm run build` (handled automatically by `vercel.json`)
* **Output Directory:** `frontend/dist` (handled automatically by `vercel.json`)

### Step 4: Add Environment Variables in Vercel
Under the **Environment Variables** section in the Vercel import page:
* `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key.
* `JWT_SECRET`: `mediassist_ai_super_secret_jwt_key_2026` (or any custom secret).

### Step 5: Deploy!
* Click **"Deploy"**.
* Vercel will build the React static bundle and provision the Python serverless function for `/api/*` and `/docs`.
* Once finished, your live app will be accessible at `https://your-project-name.vercel.app`.

---

## 🌐 Option 2: Separate Deployment (Frontend on Vercel + Backend on Render/Railway)

If you prefer long-running background tasks, persistent file storage, or high-throughput WebSocket streams:

### A. Deploy Backend to Render or Railway
1. **Render.com:**
   * Create a new **Web Service** connected to your repository.
   * **Root Directory:** `backend`
   * **Runtime:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   * Copy your backend live URL: `https://mediassist-backend.onrender.com`.

### B. Deploy Frontend to Vercel
1. In Vercel, import your repository.
2. Set **Root Directory:** `frontend`.
3. Set **Environment Variable:**
   * `VITE_API_URL`: `https://mediassist-backend.onrender.com`
4. Click **Deploy**.

---

## 💻 Option 3: Running Locally

### Backend:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Interactive API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
* Web App: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 🧪 Testing
Run the automated test suites inside `backend/`:
```bash
cd backend
python tests/test_disclaimer_and_trends.py
python tests/test_non_medical_image_rejection.py
python tests/test_medical_scope_guardrail.py
python tests/test_medical_qa.py
python tests/test_chat_history.py
python tests/test_document_deletion.py
python tests/test_e2e_live.py
```
All tests should return `PASS 100%`.
