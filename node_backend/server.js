import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import fetch from 'node-fetch';


const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000/predict';

async function callOpenAI(messages, model = 'gpt-4o-mini') {
  const response = await openai.chat.completions.create({
    model,
    messages
  });
  const content = response.choices?.[0]?.message?.content ?? '';
  return content;
}

app.post('/api/chat', async (req, res) => {
  try {
    const userInput = (req.body?.message || '').toString().trim();
    if (!userInput) return res.json({ reply: "Please enter a message." });

    const relevancePrompt = [
      { role: 'system', content: 'You are a medical assistant. Classify user input as "Relevant" if it mentions symptoms, medical issues, or health concerns, or "Irrelevant" otherwise. Respond ONLY with the single word Relevant or Irrelevant.' },
      { role: 'user', content: userInput }
    ];

    const relevanceText = await callOpenAI(relevancePrompt);
    const relevance = relevanceText.split('\n')[0].trim().replace(/["'.]/g, '');

    if (relevance.toLowerCase() !== 'relevant') {
      const greetings = ['hi','hello','hey','thanks','thank you'];
      const lowerInput = userInput.toLowerCase();
      const isGreeting = greetings.some(g => lowerInput.includes(g));
      if (isGreeting) {
        return res.json({ reply: "Hello! I'm your AI assistant. I can help with health concerns and symptom analysis. Please tell me if you have any symptoms." });
      } else {
        return res.json({ reply: "I'm here to help with health-related questions. Please describe any symptoms or medical concerns you have." });
      }
    }

    const extractPrompt = [
      { role: 'system', content: 'You extract medical symptoms, signs, and short risk phrases from user text. Return ONLY a JSON array of strings (e.g. [\"fatigue\",\"jaundice\"]) with no extra commentary.' },
      { role: 'user', content: userInput }
    ];

    const extractText = await callOpenAI(extractPrompt);
    let symptoms = [];
    try {
      const firstJson = extractText.trim().match(/\[.*\]/s);
      const jsonText = firstJson ? firstJson[0] : extractText;
      symptoms = JSON.parse(jsonText);
      if (!Array.isArray(symptoms)) symptoms = [];
    } catch (err) {
      symptoms = [];
    }

    const payload = { symptoms, raw_text: userInput };
    const mlResp = await fetch(ML_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!mlResp.ok) {
      const text = await mlResp.text().catch(() => '');
      console.error('ML server error:', mlResp.status, text);
      return res.json({ reply: "Sorry, the prediction service is currently unavailable. Please try again later." });
    }

    const mlData = await mlResp.json();

    let humanized = '';
    if (!mlData || mlData.disease_present === false) {
      humanized = "Based on the information provided, the system does not identify a likely genetic disease. If you are worried or symptoms persist, please consult a healthcare professional.";
    } else {
      const type = mlData.disease_type || 'a genetic condition';
      const test = mlData.recommended_test || 'further medical evaluation';
      humanized = `The system indicates a possible ${type}. Recommended next step: ${test}. This is not a diagnosis—please consult a qualified healthcare professional for confirmation.`;
    }

    return res.json({ reply: humanized, raw_ml: mlData, extracted_symptoms: symptoms });
  } catch (error) {
    console.error('Server error:', error);
    return res.json({ reply: "An error occurred while processing your request. Please try again." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Node server running on port ${PORT}`));
