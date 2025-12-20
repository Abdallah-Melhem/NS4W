import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fetch from "node-fetch";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

/* ================= CONFIG ================= */
const PORT = process.env.PORT || 3000;
const FLASK_API_URL = process.env.FLASK_API_URL;

// Ollama local LLM
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:latest";

if (!FLASK_API_URL) {
  console.error("❌ Missing FLASK_API_URL in .env (example: http://127.0.0.1:5000)");
  process.exit(1);
}

/* ================= PATHS ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, "..", "frontend");
const INDEX_PATH = path.join(FRONTEND_DIR, "index.html");

console.log("📁 __dirname =", __dirname);
console.log("📁 FRONTEND_DIR =", FRONTEND_DIR);
console.log("📄 INDEX_PATH =", INDEX_PATH);
console.log("✅ index.html exists?", fs.existsSync(INDEX_PATH));

/* ================= MIDDLEWARE ================= */
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "genetic-chat-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" }
  })
);

/* ================= SESSION DATA ================= */
const ALL_FIELDS = [
  "blood_cell_count_mcl",
  "white_blood_cell_count_thousand_per_microliter",
  "patient_age",
  "mothers_age",
  "fathers_age",
  "genes_in_mothers_side",
  "inherited_from_father",
  "no_of_previous_abortion",
  "ho_substance_abuse",
  "birth_asphyxia",
  "paternal_gene"
];

const REQUIRED_FIELDS = [
  "blood_cell_count_mcl",
  "white_blood_cell_count_thousand_per_microliter",
  "patient_age",
  "mothers_age",
  "fathers_age"
];

function initializeSession(req) {
  if (!req.session.userData) {
    req.session.userData = Object.fromEntries(ALL_FIELDS.map((f) => [f, null]));
  }
}

/* ================= UTILS ================= */
function prettyFieldName(field) {
  return field
    .replace(/_/g, " ")
    .replace(/\bmcl\b/i, "(/mcl)")
    .replace(/\bthousand per microliter\b/i, "(thousand/µL)");
}

function validateCoreFields(data) {
  const missing = REQUIRED_FIELDS.filter(
    (field) => data[field] === null || data[field] === undefined
  );
  return { isValid: missing.length === 0, missing };
}

function sanitizeAndMergeUpdates(sessionData, updates) {
  // Only allow known fields
  for (const key of Object.keys(updates || {})) {
    if (!ALL_FIELDS.includes(key)) continue;

    const val = updates[key];

    // Normalize yes/no fields to "yes" | "no"
    const yesNoFields = [
      "genes_in_mothers_side",
      "inherited_from_father",
      "ho_substance_abuse",
      "birth_asphyxia",
      "paternal_gene"
    ];

    if (yesNoFields.includes(key)) {
      if (typeof val === "string") {
        const v = val.trim().toLowerCase();
        if (v === "yes" || v === "no") sessionData[key] = v;
      }
      continue;
    }

    // Numeric fields
    if (
      ["blood_cell_count_mcl", "white_blood_cell_count_thousand_per_microliter"].includes(key)
    ) {
      const num = Number(val);
      if (Number.isFinite(num)) sessionData[key] = num;
      continue;
    }

    if (["patient_age", "mothers_age", "fathers_age", "no_of_previous_abortion"].includes(key)) {
      const num = Number.parseInt(val, 10);
      if (Number.isFinite(num)) sessionData[key] = num;
      continue;
    }
  }
}

/* ================= OLLAMA (LLM) ================= */
async function callOllama(messages, { timeoutMs = 25000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false
      })
    });

    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`Ollama error ${resp.status}: ${text}`);
    }

    const data = JSON.parse(text);
    return data?.message?.content ?? "";
  } finally {
    clearTimeout(t);
  }
}

// Ask LLM to extract structured updates from the user's message
async function llmExtractUpdates(userMessage, currentData) {
  const system = `
You are an assistant that extracts structured medical intake fields from user messages.

Return ONLY valid JSON (no markdown, no extra text).

Schema:
{
  "updates": {
    "blood_cell_count_mcl": number|null,
    "white_blood_cell_count_thousand_per_microliter": number|null,
    "patient_age": integer|null,
    "mothers_age": integer|null,
    "fathers_age": integer|null,
    "genes_in_mothers_side": "yes"|"no"|null,
    "inherited_from_father": "yes"|"no"|null,
    "no_of_previous_abortion": integer|null,
    "ho_substance_abuse": "yes"|"no"|null,
    "birth_asphyxia": "yes"|"no"|null,
    "paternal_gene": "yes"|"no"|null
  }
}

Rules:
- If a value is not clearly provided, use null.
- If user provides ranges/approx, pick the best single value or null if too unclear.
- Normalize yes/no to exactly "yes" or "no".
- Do not invent values.
`;

  const user = `
User message:
"${userMessage}"

Current stored data (may contain nulls):
${JSON.stringify(currentData, null, 2)}

Extract any new values from the user message into "updates". Keep fields not mentioned as null.
`;

  const raw = await callOllama([
    { role: "system", content: system.trim() },
    { role: "user", content: user.trim() }
  ]);

  // Robust JSON parse (handles small accidental leading/trailing text)
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    return { updates: {} };
  }

  const jsonStr = raw.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonStr);
  return { updates: parsed?.updates || {} };
}

// Ask LLM to phrase a good follow-up question for missing fields
async function llmFollowUp(missingFields, dataSoFar) {
  const system = `
You are a friendly assistant. Ask ONE short question to collect the missing items.
Be simple and readable. No medical advice.
`;

  const user = `
Missing fields:
${missingFields.join(", ")}

Data so far:
${JSON.stringify(dataSoFar, null, 2)}

Ask one question that requests these missing fields clearly (you can list them).
`;

  const answer = await callOllama([
    { role: "system", content: system.trim() },
    { role: "user", content: user.trim() }
  ]);

  return (answer || "").trim() || `Please provide: ${missingFields.map(prettyFieldName).join(", ")}`;
}

// Humanize the ML result
async function llmHumanizePrediction(prediction, confidence) {
  const system = `
You are a health-data chatbot. Rewrite model output in a simple, calm way.
No diagnosis claims. No treatment advice. No alarming language.
Output 3-6 lines, easy for a non-expert.
`;

  const user = `
Model prediction: ${prediction}
Confidence: ${confidence}

Explain what this means in simple words, and suggest next step: "share results with a clinician" (one sentence).
`;

  const answer = await callOllama([
    { role: "system", content: system.trim() },
    { role: "user", content: user.trim() }
  ]);

  return (answer || "").trim();
}

/* ================= SERVE FRONTEND ================= */
app.use(express.static(FRONTEND_DIR));

/* Optional: quick health checks */
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/ollama", async (req, res) => {
  try {
    // lightweight ping: ask for a tiny response
    const out = await callOllama([
      { role: "system", content: "Reply with the single word: OK" },
      { role: "user", content: "ping" }
    ], { timeoutMs: 8000 });

    res.json({ ok: true, model: OLLAMA_MODEL, reply: out.trim() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, url: OLLAMA_URL, model: OLLAMA_MODEL });
  }
});

/* ================= API ================= */
app.post("/api/chat", async (req, res) => {
  try {
    initializeSession(req);

    const message = req.body?.message;
    if (!message) return res.json({ reply: "Please type a message." });

    const lowerMsg = String(message).toLowerCase();

    // Reset
    if (lowerMsg.includes("reset") || lowerMsg.includes("start over")) {
      req.session.userData = null;
      initializeSession(req);
      return res.json({
        reply:
          "Session reset.\nPlease provide:\n• Blood cell count\n• White blood cell count\n• Patient age\n• Mother's age\n• Father's age"
      });
    }

    // Status
    if (lowerMsg.includes("status") || lowerMsg.includes("show data")) {
      const d = req.session.userData;
      const response =
        "Current data:\n" +
        `• Blood cell count: ${d.blood_cell_count_mcl ?? "Not set"}\n` +
        `• White blood cell count: ${d.white_blood_cell_count_thousand_per_microliter ?? "Not set"}\n` +
        `• Patient age: ${d.patient_age ?? "Not set"}\n` +
        `• Mother's age: ${d.mothers_age ?? "Not set"}\n` +
        `• Father's age: ${d.fathers_age ?? "Not set"}\n` +
        `• Genes in mother's side: ${d.genes_in_mothers_side ?? "Not set"}\n` +
        `• Inherited from father: ${d.inherited_from_father ?? "Not set"}\n` +
        `• Previous abortions: ${d.no_of_previous_abortion ?? "Not set"}\n` +
        `• Substance abuse: ${d.ho_substance_abuse ?? "Not set"}\n` +
        `• Birth asphyxia: ${d.birth_asphyxia ?? "Not set"}\n` +
        `• Paternal gene: ${d.paternal_gene ?? "Not set"}`;
      return res.json({ reply: response });
    }

    // 1) LLM extraction
    const { updates } = await llmExtractUpdates(message, req.session.userData);

    // 2) Merge
    sanitizeAndMergeUpdates(req.session.userData, updates);

    // 3) Validate required fields
    const validation = validateCoreFields(req.session.userData);
    if (!validation.isValid) {
      const missingNice = validation.missing.map(prettyFieldName);
      const followUp = await llmFollowUp(missingNice, req.session.userData);

      return res.json({
        reply: `${followUp}\n\n(Type "status" to see current data)`
      });
    }

    // 4) Build payload (remove nulls)
    const payload = { ...req.session.userData };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === null || payload[k] === undefined) delete payload[k];
    });

    // 5) Call Flask
    const flaskUrl = `${FLASK_API_URL.replace(/\/$/, "")}/predict`;
    const flaskResp = await fetch(flaskUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const flaskText = await flaskResp.text();
    if (!flaskResp.ok) {
      return res.json({ reply: `Prediction error: ${flaskText}` });
    }

    const result = JSON.parse(flaskText);

    // 6) Humanize
    const prediction = result?.prediction ?? "Unknown";
    const confidence = typeof result?.confidence === "number" ? result.confidence : null;

    const human = await llmHumanizePrediction(
      prediction,
      confidence === null ? "N/A" : `${(confidence * 100).toFixed(1)}%`
    );

    // 7) Clear session after successful prediction
    req.session.userData = null;

    return res.json({
      reply:
        `${human}\n\n` +
        `Result:\n• Prediction: ${prediction}\n` +
        (confidence === null ? "" : `• Confidence: ${(confidence * 100).toFixed(1)}%\n`) +
        `\n(Type new values to predict again)`
    });
  } catch (err) {
    console.error(err);
    return res.json({
      reply:
        `Error: ${err.message}\n\n` +
        `Quick checks:\n` +
        `• Is Ollama running at ${OLLAMA_URL}?\n` +
        `• Do you have model "${OLLAMA_MODEL}" pulled?\n` +
        `• Is Flask running at ${FLASK_API_URL}?`
    });
  }
});

/* ================= SPA fallback (Fix cannot GET / blank page) ================= */
/* This must be AFTER /api routes */
app.get(/^\/(?!api).*/, (req, res) => {
  if (!fs.existsSync(INDEX_PATH)) {
    return res.status(500).send(`index.html not found.\nExpected at:\n${INDEX_PATH}`);
  }
  res.sendFile(INDEX_PATH);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🧠 Ollama: ${OLLAMA_URL} | model: ${OLLAMA_MODEL}`);
});