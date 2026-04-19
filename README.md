# IB IA Grader

A web app that grades IB Internal Assessments and generates practice questions using the Claude API. Supports 7 subjects with official IB rubric criteria.

## Supported Subjects

- Mathematics (AA/AI) — 20 marks
- Biology, Chemistry, Physics — 24 marks each
- Economics — 45 marks
- History — 25 marks
- Psychology — 22 marks

---

## Prerequisites

- Python 3.10+
- An [Anthropic API key](https://console.anthropic.com/)

---

## Setup

**1. Clone the repo**

```bash
git clone https://github.com/marinamen/ib-ia-grader.git
cd ib-ia-grader
```

**2. Install dependencies**

```bash
cd backend
pip3 install -r requirements.txt
```

**3. Set your API key**

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

Or create a `.env` file in `backend/`:

```
ANTHROPIC_API_KEY=your_api_key_here
```

**4. Start the server**

```bash
uvicorn main:app --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## How it works

### Grading

`POST /grade` accepts either a PDF file or raw text, plus an optional subject. If no subject is provided, the model reads the IA and figures it out automatically.

The grader scores each criterion individually against the official IB descriptors and returns per-criterion scores, strengths, improvements, and an overall grade band (1–7).

```bash
curl -X POST http://localhost:8000/grade \
  -F "file=@my_ia.pdf" \
  -F "subject=biology"
```

Or with plain text:

```bash
curl -X POST http://localhost:8000/grade \
  -F "text=My research question is..." \
  -F "subject=mathematics"
```

### Practice questions

`POST /practice` takes a subject and topic and returns IB-style questions with hints.

```bash
curl -X POST http://localhost:8000/practice \
  -H "Content-Type: application/json" \
  -d '{"subject": "chemistry", "topic": "rate of reaction and temperature", "count": 5}'
```

### List subjects

```bash
curl http://localhost:8000/subjects
```

---

## Project structure

```
ib-ia-grader/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── grader.py        # Claude API calls for grading and question generation
│   ├── rubrics.py       # IB mark schemes for all 7 subjects
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## Extending to a new subject

All rubrics live in `backend/rubrics.py`. To add a subject, append an entry to the `RUBRICS` dict following the same shape as the existing ones — a `name`, `total` marks, and a `criteria` dict where each key is a criterion name and each value has `max` and `descriptors` (score → description).

Then add any shorthand aliases to `SUBJECT_ALIASES` so the auto-detection catches common abbreviations.

---

## API response shape

```json
{
  "subject": "biology",
  "total_score": 19,
  "max_score": 24,
  "grade_band": "6",
  "criteria_scores": {
    "Exploration": {
      "score": 5,
      "max": 6,
      "justification": "...",
      "strengths": ["..."],
      "improvements": ["..."]
    }
  },
  "overall_feedback": "...",
  "key_strengths": ["..."],
  "priority_improvements": ["..."]
}
```

---

## Notes

- PDF parsing uses `pdfplumber` — scanned PDFs without a text layer won't extract properly
- The grader works best when the full IA text is provided, not just an abstract or excerpt
- Economics IAs are graded per commentary (the rubric applies to each of the 3 commentaries individually)
