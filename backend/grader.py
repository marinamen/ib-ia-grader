import anthropic
import json
from rubrics import RUBRICS, SUBJECT_ALIASES

client = anthropic.Anthropic()

SYSTEM_PROMPT = """You are an expert IB examiner with extensive experience grading Internal Assessments across all IB subjects.
You provide accurate, fair, and detailed feedback following official IB marking criteria.
Always respond with valid JSON only. No markdown, no extra text."""


def detect_subject(text: str) -> str | None:
    text_lower = text.lower()
    for alias, subject in SUBJECT_ALIASES.items():
        if alias in text_lower:
            return subject
    for subject in RUBRICS:
        if subject in text_lower:
            return subject
    return None


def grade_ia(ia_text: str, subject: str) -> dict:
    rubric = RUBRICS[subject]
    criteria_str = json.dumps(rubric["criteria"], indent=2)

    prompt = f"""Grade the following IB {rubric['name']} Internal Assessment using the official IB rubric below.

RUBRIC:
{criteria_str}

IA TEXT:
{ia_text}

Return a JSON object with this exact structure:
{{
  "subject": "{subject}",
  "total_score": <number>,
  "max_score": {rubric['total']},
  "grade_band": "<7|6|5|4|3|2|1>",
  "criteria_scores": {{
    "<criterion_key>": {{
      "score": <number>,
      "max": <number>,
      "justification": "<2-3 sentences explaining the score>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "improvements": ["<improvement 1>", "<improvement 2>"]
    }}
  }},
  "overall_feedback": "<3-4 sentences of holistic feedback>",
  "key_strengths": ["<top strength 1>", "<top strength 2>", "<top strength 3>"],
  "priority_improvements": ["<top improvement 1>", "<top improvement 2>", "<top improvement 3>"]
}}

Grade band mapping (use the subject's max score):
- 7: 85-100% of max
- 6: 70-84%
- 5: 55-69%
- 4: 45-54%
- 3: 35-44%
- 2: 20-34%
- 1: 0-19%"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    result = json.loads(response.content[0].text)
    return result


def generate_practice_questions(subject: str, topic: str, count: int = 5) -> dict:
    rubric = RUBRICS[subject]

    prompt = f"""Generate {count} IB-style practice questions for an IB {rubric['name']} Internal Assessment on the topic: "{topic}".

Return a JSON object with this exact structure:
{{
  "subject": "{subject}",
  "topic": "{topic}",
  "questions": [
    {{
      "id": 1,
      "question": "<full question text>",
      "type": "<research_question|data_analysis|evaluation|reflection>",
      "hints": ["<hint 1>", "<hint 2>"],
      "relevant_criteria": ["<criterion name>"]
    }}
  ]
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    return json.loads(response.content[0].text)


def identify_subject_from_ia(ia_text: str) -> dict:
    subjects_list = ", ".join(RUBRICS.keys())

    prompt = f"""Read the following Internal Assessment text and identify which IB subject it belongs to.

Available subjects: {subjects_list}

IA TEXT (first 2000 chars):
{ia_text[:2000]}

Return JSON:
{{
  "subject": "<subject key from the list above or null if unclear>",
  "confidence": "<high|medium|low>",
  "reasoning": "<one sentence explanation>"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    return json.loads(response.content[0].text)
