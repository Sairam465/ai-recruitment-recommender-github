# AI-Powered Recruitment Recommendation System

A hackathon-ready full-stack MVP that compares resumes with a job description and ranks candidates using explainable skill/keyword matching.

## Features
- Paste a job description
- Upload multiple PDF, DOCX, or TXT resumes
- Extract text from resumes
- Calculate match score and matched/missing keywords
- Rank candidates and review results in a dashboard
- Optional MongoDB persistence (the app works without MongoDB)

> This is a decision-support prototype, not an automated hiring decision-maker. Scores are approximate keyword relevance indicators and should not be used as the sole basis for employment decisions.

## Tech stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Resume parsing: `pdf-parse`, `mammoth`
- Optional database: MongoDB + Mongoose

## Requirements
- Node.js 18+
- npm
- Optional: MongoDB connection string

## Run locally

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
The API runs at `http://localhost:5000`.

### 2. Frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Optional MongoDB
Set `MONGODB_URI` in `server/.env`. If it is empty, the API runs in memory and results are not persisted.

## API
- `GET /api/health` — health check
- `POST /api/analyze` — multipart form with `jobDescription` and one or more `resumes` files

## GitHub upload
Create a new GitHub repository, then from this project folder:
```bash
git init
git add .
git commit -m "Build AI recruitment recommendation system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-recruitment-recommender.git
git push -u origin main
```

## Demo flow
1. Paste a job description for a Software Engineer.
2. Upload 2–5 sample resumes (use synthetic/demo resumes and remove personal contact details).
3. Click **Analyze candidates**.
4. Explain match score, matched skills, and missing skills for each candidate.

## Limitations and responsible use
- Current matching uses normalized keyword overlap, not a trained hiring model.
- It intentionally does not score protected characteristics such as age, gender, race, religion, disability, or nationality.
- Keep candidate files private, obtain consent, and delete uploads when no longer needed.
- Human reviewers should verify all extracted skills and make final decisions.
