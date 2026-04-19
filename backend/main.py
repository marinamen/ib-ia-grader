import io
import os
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pdfplumber

from grader import detect_subject, grade_ia, generate_practice_questions, identify_subject_from_ia
from rubrics import RUBRICS

app = FastAPI(title="IB IA Grader", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")


@app.get("/")
async def root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/subjects")
async def list_subjects():
    return {
        subject: {
            "name": data["name"],
            "total": data["total"],
            "criteria": list(data["criteria"].keys()),
        }
        for subject, data in RUBRICS.items()
    }


@app.post("/grade")
async def grade_submission(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    subject: str | None = Form(default=None),
):
    ia_text = ""

    if file and file.filename:
        content = await file.read()
        if file.filename.endswith(".pdf"):
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                ia_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        else:
            ia_text = content.decode("utf-8", errors="ignore")
    elif text:
        ia_text = text
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or text.")

    if not ia_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from submission.")

    if not subject:
        detected = identify_subject_from_ia(ia_text)
        subject = detected.get("subject")
        if not subject or subject not in RUBRICS:
            raise HTTPException(
                status_code=422,
                detail="Could not identify subject. Please specify it manually.",
            )

    subject = subject.lower()
    if subject not in RUBRICS:
        raise HTTPException(status_code=400, detail=f"Unknown subject: {subject}. Valid: {list(RUBRICS.keys())}")

    result = grade_ia(ia_text, subject)
    return result


class PracticeRequest(BaseModel):
    subject: str
    topic: str
    count: int = 5


@app.post("/practice")
async def get_practice_questions(req: PracticeRequest):
    if req.subject not in RUBRICS:
        raise HTTPException(status_code=400, detail=f"Unknown subject: {req.subject}")
    if req.count < 1 or req.count > 20:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 20.")
    return generate_practice_questions(req.subject, req.topic, req.count)


app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
