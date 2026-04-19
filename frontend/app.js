const API = "";

// Tab navigation
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(t => { t.classList.remove("active"); t.classList.add("hidden"); });
    btn.classList.add("active");
    const target = document.getElementById(`tab-${tab}`);
    target.classList.remove("hidden");
    target.classList.add("active");
  });
});

// Load subjects
async function loadSubjects() {
  try {
    const res = await fetch(`${API}/subjects`);
    const subjects = await res.json();
    const gradeSelect = document.getElementById("subject-select");
    const practiceSelect = document.getElementById("practice-subject");

    Object.entries(subjects).forEach(([key, val]) => {
      const opt1 = new Option(val.name, key);
      const opt2 = new Option(val.name, key);
      gradeSelect.appendChild(opt1);
      practiceSelect.appendChild(opt2);
    });
  } catch (e) {
    console.error("Failed to load subjects", e);
  }
}
loadSubjects();

// File upload
const uploadArea = document.getElementById("upload-area");
const fileInput = document.getElementById("file-input");
const uploadPrompt = document.getElementById("upload-prompt");
const fileInfo = document.getElementById("file-info");
const fileName = document.getElementById("file-name");

document.getElementById("browse-btn").addEventListener("click", () => fileInput.click());
uploadArea.addEventListener("click", e => { if (e.target === uploadArea) fileInput.click(); });

uploadArea.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
uploadArea.addEventListener("drop", e => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  const f = e.dataTransfer.files[0];
  if (f) setFile(f);
});

fileInput.addEventListener("change", () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });

function setFile(f) {
  fileInput.files = createFileList(f);
  fileName.textContent = f.name;
  uploadPrompt.classList.add("hidden");
  fileInfo.classList.remove("hidden");
}

document.getElementById("remove-file").addEventListener("click", () => {
  fileInput.value = "";
  uploadPrompt.classList.remove("hidden");
  fileInfo.classList.add("hidden");
});

function createFileList(file) {
  const dt = new DataTransfer();
  dt.items.add(file);
  return dt.files;
}

// Grade form
document.getElementById("grade-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btnText = document.getElementById("btn-text");
  const btnLoader = document.getElementById("btn-loader");
  const submitBtn = document.getElementById("submit-btn");

  btnText.classList.add("hidden");
  btnLoader.classList.remove("hidden");
  submitBtn.disabled = true;
  document.getElementById("results").classList.add("hidden");

  try {
    const formData = new FormData();
    const subject = document.getElementById("subject-select").value;
    const text = document.getElementById("ia-text").value;
    const file = fileInput.files[0];

    if (file) formData.append("file", file);
    if (text) formData.append("text", text);
    if (subject) formData.append("subject", subject);

    const res = await fetch(`${API}/grade`, { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Grading failed.");
    }
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
    submitBtn.disabled = false;
  }
});

function renderResults(data) {
  document.getElementById("total-score").textContent = data.total_score;
  document.getElementById("max-score-label").textContent = `/ ${data.max_score}`;
  document.getElementById("subject-label").textContent = `IB ${data.subject} Internal Assessment`;
  document.getElementById("overall-feedback").textContent = data.overall_feedback;

  const badge = document.getElementById("grade-badge");
  badge.textContent = `Grade ${data.grade_band}`;
  badge.className = `grade-badge grade-${data.grade_band}`;

  const strengthsList = document.getElementById("strengths-list");
  strengthsList.innerHTML = data.key_strengths.map(s => `<li>${s}</li>`).join("");

  const improvList = document.getElementById("improvements-list");
  improvList.innerHTML = data.priority_improvements.map(s => `<li>${s}</li>`).join("");

  const criteriaContainer = document.getElementById("criteria-cards");
  criteriaContainer.innerHTML = "";
  Object.entries(data.criteria_scores).forEach(([key, c]) => {
    const pct = Math.round((c.score / c.max) * 100);
    const barColor = pct >= 75 ? "var(--green)" : pct >= 50 ? "var(--yellow)" : "var(--red)";
    const card = document.createElement("div");
    card.className = "criterion-card";
    card.innerHTML = `
      <div class="criterion-header">
        <div class="criterion-name">Criterion ${key}: ${c.name || key}</div>
        <div class="criterion-score">${c.score} / ${c.max}</div>
      </div>
      <div class="score-bar-bg">
        <div class="score-bar-fill" style="width:${pct}%; background:${barColor}"></div>
      </div>
      <p class="criterion-justification">${c.justification}</p>
      <div class="criterion-lists">
        <div class="strengths-col">
          <h4>Strengths</h4>
          <ul>${(c.strengths || []).map(s => `<li>${s}</li>`).join("")}</ul>
        </div>
        <div class="improvements-col">
          <h4>To Improve</h4>
          <ul>${(c.improvements || []).map(s => `<li>${s}</li>`).join("")}</ul>
        </div>
      </div>`;
    criteriaContainer.appendChild(card);
  });

  const results = document.getElementById("results");
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Practice form
document.getElementById("practice-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btnText = document.getElementById("practice-btn-text");
  const btnLoader = document.getElementById("practice-btn-loader");
  const btn = document.getElementById("practice-btn");

  btnText.classList.add("hidden");
  btnLoader.classList.remove("hidden");
  btn.disabled = true;
  document.getElementById("practice-results").classList.add("hidden");

  try {
    const res = await fetch(`${API}/practice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: document.getElementById("practice-subject").value,
        topic: document.getElementById("practice-topic").value,
        count: parseInt(document.getElementById("practice-count").value),
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to generate questions.");
    }
    const data = await res.json();
    renderPractice(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
    btn.disabled = false;
  }
});

function renderPractice(data) {
  document.getElementById("practice-topic-label").textContent =
    `${data.subject.charAt(0).toUpperCase() + data.subject.slice(1)} — ${data.topic}`;

  const container = document.getElementById("questions-list");
  container.innerHTML = data.questions.map(q => `
    <div class="question-card">
      <div class="question-meta">
        <span class="q-number">Q${q.id}</span>
        <span class="q-type">${(q.type || "").replace(/_/g, " ")}</span>
      </div>
      <p class="question-text">${q.question}</p>
      ${q.hints && q.hints.length ? `
      <details class="question-hints">
        <summary>Show hints</summary>
        <ul>${q.hints.map(h => `<li>${h}</li>`).join("")}</ul>
      </details>` : ""}
    </div>`).join("");

  const results = document.getElementById("practice-results");
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}
