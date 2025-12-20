import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import OpenAI from "openai";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

/* ===================== SESSION ===================== */
app.use(
  session({
    secret: "genetic-chat-secret",
    resave: false,
    saveUninitialized: true
  })
);

/* ===================== CONFIG ===================== */
const PORT = process.env.PORT || 3000;
const FLASK_API_URL = process.env.FLASK_API_URL;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: NVIDIA_API_KEY
});

/* ===================== STATIC FRONTEND ===================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../frontend")));

/* ===================== FEATURES ===================== */
const CORE_FEATURES = [
  "patient_age",
  "mothers_age",
  "fathers_age",
  "blood_cell_count_mcl",
  "white_blood_cell_count_thousand_per_microliter"
];

const FEATURE_LABELS = {
  patient_age: "your age",
  mothers_age: "your mother’s age",
  fathers_age: "your father’s age",
  blood_cell_count_mcl: "blood cell count",
  white_blood_cell_count_thousand_per_microliter: "white blood cell count"
};

const disorderExamples = {
  "mitochondrial genetic inheritance disorders": [
    "Leigh syndrome",
    "Mitochondrial myopathy",
    "Leber’s hereditary optic neuropathy"
  ],
  "single-gene inheritance diseases": [
    "Cystic fibrosis",
    "Tay-Sachs disease",
    "Hemochromatosis"
  ],
  "multifactorial genetic inheritance disorders": [
    "Diabetes",
    "Alzheimer’s disease",
    "Cancer"
  ]
};

/* ===================== HELPERS ===================== */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function isMissing(v) {
  return v === undefined || v === null || v === "";
}

/* ===================== CHAT ===================== */
app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;
    if (!message) return res.json({ reply: "Please type a message." });

    // Initialize session memory
    if (!req.session.data) req.session.data = {};

    /* ===== EXTRACT FEATURES ===== */
    const extractionPrompt = `
Extract medical data from text.
If greeting → {"type":"smalltalk"}
Else → {"type":"medical","data":{...}}

Text: "${message}"
`;

    const extraction = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: extractionPrompt }],
      temperature: 0
    });

    const parsed = safeJsonParse(extraction.choices[0].message.content);

    if (!parsed || parsed.type === "smalltalk") {
      return res.json({
        reply: "Hi! You can share your age, parents’ ages, and blood test values."
      });
    }

    // MERGE DATA INTO SESSION
    Object.entries(parsed.data || {}).forEach(([k, v]) => {
      if (!isMissing(v)) req.session.data[k] = v;
    });

    /* ===== CHECK MISSING ===== */
    const missing = CORE_FEATURES.filter(f => isMissing(req.session.data[f]));

    if (missing.length > 0) {
      return res.json({
        reply: `Thanks. I still need: ${missing.map(m => FEATURE_LABELS[m]).join(", ")}.`
      });
    }

    /* ===== CALL FLASK ===== */
    const flaskResp = await fetch(`${FLASK_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.session.data)
    });

    const result = await flaskResp.json();

    const examples = disorderExamples[result.prediction] || [];

    return res.json({
      reply:
        `Based on the information provided, the model suggests **${result.prediction}**.\n` +
        `This may include conditions such as ${examples.join(", ")}.\n\n` +
        `This is not a diagnosis. Please consult a medical professional.`
    });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Something went wrong." });
  }
});

/* ===================== START ===================== */
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
