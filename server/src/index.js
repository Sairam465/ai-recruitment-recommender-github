import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import crypto from "node:crypto";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 15 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|docx|txt)$/i.test(file.originalname);
    cb(allowed ? null : new Error("Only PDF, DOCX, and TXT files are supported."), allowed);
  }
});

const CandidateSchema = new mongoose.Schema({
  name: String,
  fileName: String,
  score: Number,
  matchedSkills: [String],
  missingSkills: [String],
  analyzedAt: { type: Date, default: Date.now }
});
const AnalysisSchema = new mongoose.Schema({
  jobDescription: String,
  candidates: [CandidateSchema],
  createdAt: { type: Date, default: Date.now }
});
const Analysis = mongoose.model("Analysis", AnalysisSchema);
const memoryAnalyses = [];

const STOP_WORDS = new Set(("a an and are as at be been being by can candidate candidates for from has have in is it job of on or our should skills that the their this to we will with work working years you your required preferred experience using use strong knowledge ability role team").split(" "));
const COMMON_SKILLS = [
  "javascript","typescript","react","node.js","node","express","mongodb","sql","python","java","c++",
  "html","css","tailwind","rest api","restful api","git","github","docker","aws","azure","gcp",
  "machine learning","deep learning","nlp","pytorch","tensorflow","scikit-learn","pandas","numpy",
  "postgresql","mysql","redis","linux","kubernetes","communication","problem solving","testing",
  "agile","data analysis","excel","power bi","tableau","fastapi","django","flask","next.js"
];

function normalize(text) {
  return text.toLowerCase()
    .replace(/[^\p{L}\p{N}+#./\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function extractKeywords(text) {
  const normalized = normalize(text);
  const found = new Set();
  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(normalized)) found.add(skill);
  }
  const tokens = normalized.split(/[\s,;:()[\]{}]+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  // Include a few repeated domain terms, while keeping common skills as the primary signal.
  [...counts.entries()].filter(([, count]) => count >= 2).sort((a,b) => b[1]-a[1]).slice(0, 20)
    .forEach(([token]) => found.add(token));
  return [...found];
}
function displayName(filename) {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Candidate";
}
async function readResume(file) {
  const ext = file.originalname.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    const result = await pdfParse(file.buffer);
    return result.text || "";
  }
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }
  return file.buffer.toString("utf8");
}
function scoreCandidate(jobDescription, resumeText, fileName) {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeKeywords = new Set(extractKeywords(resumeText));
  const matchedSkills = jobKeywords.filter(k => resumeKeywords.has(k));
  const missingSkills = jobKeywords.filter(k => !resumeKeywords.has(k));
  const score = jobKeywords.length ? Math.round((matchedSkills.length / jobKeywords.length) * 100) : 0;
  return {
    id: crypto.randomUUID(),
    name: displayName(fileName),
    fileName,
    score,
    matchedSkills,
    missingSkills,
    summary: score >= 75 ? "Strong keyword alignment" : score >= 45 ? "Partial keyword alignment" : "Limited keyword alignment"
  };
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "recruitment-recommender-api" }));

app.post("/api/analyze", upload.array("resumes", 15), async (req, res, next) => {
  try {
    const jobDescription = (req.body.jobDescription || "").trim();
    if (jobDescription.length < 30) {
      return res.status(400).json({ error: "Please provide a job description with at least 30 characters." });
    }
    if (!req.files?.length) return res.status(400).json({ error: "Upload at least one resume." });

    const results = [];
    for (const file of req.files) {
      try {
        const text = await readResume(file);
        if (!text.trim()) {
          results.push({ id: crypto.randomUUID(), name: displayName(file.originalname), fileName: file.originalname,
            score: 0, matchedSkills: [], missingSkills: extractKeywords(jobDescription),
            summary: "No readable text found; check whether the PDF is scanned." });
        } else {
          results.push(scoreCandidate(jobDescription, text, file.originalname));
        }
      } catch (error) {
        results.push({ id: crypto.randomUUID(), name: displayName(file.originalname), fileName: file.originalname,
          score: 0, matchedSkills: [], missingSkills: extractKeywords(jobDescription),
          summary: `Could not parse file: ${error.message}` });
      }
    }
    results.sort((a, b) => b.score - a.score);
    const analysis = { id: crypto.randomUUID(), jobDescription, candidates: results, createdAt: new Date().toISOString() };

    if (mongoose.connection.readyState === 1) {
      const saved = await Analysis.create({
        jobDescription,
        candidates: results.map(({ name, fileName, score, matchedSkills, missingSkills }) =>
          ({ name, fileName, score, matchedSkills, missingSkills }))
      });
      analysis.databaseId = saved._id.toString();
    } else {
      memoryAnalyses.unshift(analysis);
      if (memoryAnalyses.length > 25) memoryAnalyses.pop();
    }
    res.json(analysis);
  } catch (error) { next(error); }
});

app.get("/api/analyses", async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const docs = await Analysis.find().sort({ createdAt: -1 }).limit(20).lean();
      return res.json(docs);
    }
    res.json(memoryAnalyses.map(({ id, createdAt, candidates }) => ({ id, createdAt, candidates })));
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  const status = error instanceof multer.MulterError ? 400 : 500;
  res.status(status).json({ error: error.message || "Unexpected server error." });
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection failed; using in-memory mode:", err.message));
}
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
