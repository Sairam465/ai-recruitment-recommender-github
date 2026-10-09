# Architecture

```text
Recruiter browser (React + Vite)
          |
          | multipart/form-data: jobDescription + resumes
          v
Express API (/api/analyze)
          |
          +--> PDF text extraction (pdf-parse)
          +--> DOCX text extraction (mammoth)
          +--> TXT decoding
          |
          v
Keyword extraction + transparent overlap score
          |
          +--> ranked response to browser
          |
          +--> optional MongoDB persistence
```

## Score
`score = matched job keywords / extracted job keywords * 100`

The result is a rough signal of keyword overlap only. It does not measure candidate quality, potential, or future job performance.
