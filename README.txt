🧬 Genetic Disorder Prediction Chatbot (Local LLM + ML)

An interactive web-based chatbot that collects medical information from users through natural conversation, validates missing data, runs a machine-learning prediction model, and explains the result in simple, human-readable language.

The system runs fully locally using:

Node.js + Express (chat logic & session handling)

Ollama (LLaMA 3.2) as a local LLM

Flask + CatBoost for machine-learning prediction

HTML/CSS/JS frontend chat interface

✨ Key Features

💬 Natural conversation with users (free text, any order)

🧠 Local LLM (no external APIs, no costs, no data leakage)

🧾 Automatic extraction of medical values from text

❓ Smart follow-up questions when data is missing

📊 ML prediction using a trained CatBoost model

🧑‍⚕️ Human-friendly explanation of results

🔁 Session-based chat with status and reset commands

🏗️ System Architecture
Browser (Chat UI)
      │
      ▼
Node.js / Express
(API + Session + LLM logic)
      │
      ├── Ollama (llama3.2)
      │   └─ Extracts data & humanizes output
      │
      └── Flask API (/predict)
          └─ CatBoost ML model

🧠 Required Medical Inputs

Core (required):

Blood cell count

White blood cell count

Patient age

Mother’s age

Father’s age

Optional:

Genes in mother’s side (yes/no)

Inherited from father (yes/no)

Birth asphyxia (yes/no)

Substance abuse (yes/no)

Paternal gene (yes/no)

Number of previous abortions

The chatbot will automatically ask for anything missing.

🛠️ Tech Stack
Backend

Node.js (ES modules)

Express

express-session

node-fetch

Ollama (local LLM)

ML API

Python

Flask

CatBoost

Pandas / NumPy

Frontend

HTML

CSS

Vanilla JavaScript (Fetch API)

🚀 Setup Instructions
1️⃣ Install Ollama & Pull Model
ollama run llama3.2


Verify Ollama is running:

http://127.0.0.1:11434

2️⃣ Flask (ML API)
Install dependencies
pip install flask flask-cors pandas numpy catboost

Run Flask server
python app.py


Flask will run at:

http://127.0.0.1:5000


Health check:

GET /health

3️⃣ Node.js Backend
Install dependencies
npm install

Create .env
PORT=3000
FLASK_API_URL=http://127.0.0.1:5000
SESSION_SECRET=your_secret_here

OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:latest

Start server
node server.js


Node server runs at:

http://localhost:3000

4️⃣ Open the App

Open your browser and go to:

http://localhost:3000

💬 Example Conversation

User:

My age is 20, mom is 45

Bot:

I still need blood cell count, white blood cell count, and father’s age.

User:

blood cells 4.7, white blood cells 7.9, dad 50

Bot:

(Simple explanation of prediction)
Result:
• Prediction: X
• Confidence: Y%

🧪 Useful Commands

status → shows currently collected data

reset → clears the session and starts over

🔒 Privacy & Safety

All processing is local

No data is sent to external servers

No medical advice is given

Results are informational only

📌 Notes

Make sure the CatBoost model was trained with the same feature names and categories.

Ollama must be running before starting Node.js.

If Ollama is slow, the frontend includes request timeouts and error handling.

📄 License

This project is for educational and research purposes.
Not intended for real medical diagnosis or treatment.