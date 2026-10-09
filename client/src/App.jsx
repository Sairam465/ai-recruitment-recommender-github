import { useMemo, useState } from "react";
import { Upload, FileText, Sparkles, Users, CheckCircle2, AlertCircle, Search, ArrowUpRight, X, LoaderCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const exampleJD = `Software Engineer Intern

We are looking for a software engineer with experience in JavaScript, React, Node.js, Express, MongoDB, REST APIs, Git, SQL, testing, and problem solving. Candidates should be able to build responsive web applications, collaborate with a team, and explain technical decisions clearly. Python and AWS are a plus.`;

function ScoreRing({ score }) {
  return <div className="score-ring" style={{ "--score": `${score}%` }}><span>{score}<small>%</small></span></div>;
}
function CandidateCard({ candidate, index }) {
  return <article className="candidate-card">
    <div className="candidate-top">
      <div className="avatar">{candidate.name.slice(0, 1).toUpperCase()}</div>
      <div className="candidate-name"><span className="rank">RANK #{index + 1}</span><h3>{candidate.name}</h3><p><FileText size={13} /> {candidate.fileName}</p></div>
      <ScoreRing score={candidate.score} />
    </div>
    <div className="match-status"><span className={`status-dot ${candidate.score >= 70 ? "good" : candidate.score >= 40 ? "mid" : "low"}`} />{candidate.summary}</div>
    <div className="skill-columns">
      <div><h4><CheckCircle2 size={14} /> MATCHED ({candidate.matchedSkills.length})</h4>
        <div className="chips">{candidate.matchedSkills.length ? candidate.matchedSkills.slice(0, 12).map(s => <span className="chip matched" key={s}>{s}</span>) : <span className="muted">No matched keywords found</span>}</div>
      </div>
      <div><h4><AlertCircle size={14} /> SKILLS TO VERIFY ({candidate.missingSkills.length})</h4>
        <div className="chips">{candidate.missingSkills.length ? candidate.missingSkills.slice(0, 12).map(s => <span className="chip missing" key={s}>{s}</span>) : <span className="muted">No missing keywords detected</span>}</div>
      </div>
    </div>
  </article>;
}

export default function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [minimum, setMinimum] = useState("0");

  const visibleCandidates = useMemo(() => (results?.candidates || [])
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && c.score >= Number(minimum)), [results, search, minimum]);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const valid = incoming.filter(f => /\.(pdf|docx|txt)$/i.test(f.name) && f.size <= 5 * 1024 * 1024);
    setFiles(current => [...current, ...valid].filter((f, i, arr) => arr.findIndex(x => x.name === f.name && x.size === f.size) === i).slice(0, 15));
    if (incoming.length !== valid.length) setError("Only PDF, DOCX, or TXT files up to 5 MB each are accepted.");
    else setError("");
  }
  async function analyze() {
    setError("");
    if (jobDescription.trim().length < 30) return setError("Add a job description with at least 30 characters.");
    if (!files.length) return setError("Upload at least one resume to analyze.");
    setLoading(true);
    try {
      const body = new FormData();
      body.append("jobDescription", jobDescription);
      files.forEach(file => body.append("resumes", file));
      const response = await fetch(`${API_URL}/api/analyze`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setResults(data);
    } catch (e) {
      setError(`${e.message} Check that the backend is running at ${API_URL}.`);
    } finally { setLoading(false); }
  }
  const average = results?.candidates.length ? Math.round(results.candidates.reduce((sum, c) => sum + c.score, 0) / results.candidates.length) : 0;
  const topScore = results?.candidates.length ? Math.max(...results.candidates.map(c => c.score)) : 0;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Sparkles size={20} /></div><div><strong>TalentMatch<span> AI</span></strong><small>RECRUITMENT INTELLIGENCE</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <div className="nav-item active"><Users size={17} /> Candidate matching</div>
      <div className="side-note"><div className="pulse" /><div><strong>Matching engine ready</strong><p>Upload resumes to start a new analysis.</p></div></div>
      <div className="sidebar-footer">HACKATHON MVP <span>v1.0.0</span></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><span className="eyebrow">AI WORKSPACE / OVERVIEW</span><h1>Recruitment intelligence</h1><p>Find relevant talent faster with transparent, skill-based matching.</p></div><div className="profile"><div className="profile-avatar">HR</div><div><strong>Recruiter workspace</strong><small>Demo account</small></div></div></header>
      <section className="hero">
        <div><span className="hero-pill"><Sparkles size={13} /> SMART CANDIDATE MATCHING</span><h2>Hire for skills.<br/><span>Discover potential.</span></h2><p>Compare candidate resumes against a job description and review the skills behind each match score.</p></div>
        <div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><div className="hero-doc"><FileText size={30}/><span>RESUME</span><div/><div/><div className="short"/></div><div className="hero-check"><CheckCircle2 size={19}/><span>Profile analyzed</span></div></div>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-icon purple"><Users size={18}/></div><div><span>RESUMES UPLOADED</span><strong>{files.length}</strong><small>Current session</small></div></div>
        <div className="stat-card"><div className="stat-icon blue"><Sparkles size={18}/></div><div><span>CANDIDATES ANALYZED</span><strong>{results?.candidates.length || 0}</strong><small>Completed analysis</small></div></div>
        <div className="stat-card"><div className="stat-icon green"><CheckCircle2 size={18}/></div><div><span>TOP MATCH SCORE</span><strong>{results ? `${topScore}%` : "—"}</strong><small>Highest keyword alignment</small></div></div>
        <div className="stat-card"><div className="stat-icon amber"><ArrowUpRight size={18}/></div><div><span>AVERAGE MATCH</span><strong>{results ? `${average}%` : "—"}</strong><small>Across analyzed resumes</small></div></div>
      </section>

      <section className="workspace-grid">
        <div className="panel job-panel">
          <div className="panel-heading"><div><span className="step">01</span><div><h2>Define the role</h2><p>Paste the job description to set matching criteria.</p></div></div><button className="text-button" onClick={() => setJobDescription(exampleJD)}>Use sample JD</button></div>
          <label htmlFor="job-description">JOB DESCRIPTION</label>
          <textarea id="job-description" value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the responsibilities, required skills, and qualifications here..." rows={9}/>
          <div className="field-foot"><span>{jobDescription.trim().length} characters</span><span>Skills and keywords are extracted automatically</span></div>
        </div>
        <div className="panel upload-panel">
          <div className="panel-heading"><div><span className="step">02</span><div><h2>Add candidates</h2><p>Upload resumes to compare against this role.</p></div></div></div>
          <label className="dropzone" htmlFor="resume-files" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
            <div className="upload-icon"><Upload size={22}/></div><strong>Drop resume files here</strong><span>or <b>browse files</b></span><small>PDF, DOCX, TXT · Max 5 MB each · Up to 15 files</small>
          </label>
          <input id="resume-files" type="file" accept=".pdf,.docx,.txt" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = ""; }}/>
          {files.length > 0 && <div className="file-list">{files.map((f, i) => <div className="file-row" key={`${f.name}-${i}`}><FileText size={15}/><span>{f.name}<small>{(f.size / 1024).toFixed(0)} KB</small></span><button aria-label={`Remove ${f.name}`} onClick={() => setFiles(prev => prev.filter((_, j) => i !== j))}><X size={15}/></button></div>)}</div>}
          <button className="analyze-button" onClick={analyze} disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Analyzing resumes...</> : <><Sparkles size={17}/> Analyze candidates <ArrowUpRight size={16}/></>}</button>
          {error && <div className="error-message"><AlertCircle size={15}/>{error}</div>}
        </div>
      </section>

      {results && <section className="results-section">
        <div className="results-heading"><div><span className="eyebrow">ANALYSIS RESULTS</span><h2>Candidate recommendations <span className="result-count">{results.candidates.length}</span></h2><p>Ranked by skill and keyword overlap. Verify each profile manually.</p></div><div className="filters"><div className="search-box"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates"/></div><select value={minimum} onChange={e => setMinimum(e.target.value)} aria-label="Minimum match score"><option value="0">All scores</option><option value="40">40%+ match</option><option value="70">70%+ match</option></select></div></div>
        {visibleCandidates.length ? <div className="candidate-grid">{visibleCandidates.map(c => <CandidateCard candidate={c} index={results.candidates.findIndex(x => x.id === c.id)} key={c.id}/>)}</div> : <div className="empty-state">No candidates match these filters.</div>}
        <div className="disclaimer"><AlertCircle size={16}/><p><strong>Human review required.</strong> Scores reflect keyword overlap only; they are not a measure of candidate quality or job performance. Check context, verify qualifications, and make decisions using a fair, structured process.</p></div>
      </section>}
      <footer className="footer">TalentMatch AI · Hackathon prototype <span>Built for explainable, skill-based matching</span></footer>
    </main>
  </div>;
}
