const chatContainer = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.querySelector("button");

function appendMessage(text, className) {
  const div = document.createElement("div");
  div.className = `message ${className}`;

  const safe = String(text ?? "");
  div.innerHTML = safe.replace(/\n/g, "<br>");

  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendLoadingMessage() {
  const div = document.createElement("div");
  div.className = "message bot loading";
  div.innerHTML =
    '<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  userInput.value = "";
  sendButton.disabled = true;

  const loadingMsg = appendLoadingMessage();

  // Abort if server takes too long (prevents UI freezing)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
      signal: controller.signal
    });

    // Try read JSON, but if it fails read text
    let data = null;
    let rawText = "";
    try {
      data = await resp.json();
    } catch {
      rawText = await resp.text();
    }

    loadingMsg.remove();

    if (!resp.ok) {
      const errMsg =
        (data && (data.reply || data.error)) ||
        rawText ||
        `Server error: ${resp.status}`;
      appendMessage(`❌ ${errMsg}`, "bot");
      return;
    }

    const reply = data?.reply ?? "No response";
    appendMessage(reply, "bot");
  } catch (err) {
    loadingMsg.remove();

    if (err.name === "AbortError") {
      appendMessage(
        "⏱️ The request took too long. If you're using local LLM, make sure Ollama is running and try again.",
        "bot"
      );
    } else {
      appendMessage("❌ Network error. Please check if the server is running.", "bot");
    }

    console.error(err);
  } finally {
    clearTimeout(timeout);
    sendButton.disabled = false;
    userInput.focus();
  }
}

sendButton.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Welcome message
window.onload = () => {
  appendMessage(
    "👋 Welcome to Genetic Disorder Predictor!\n\n" +
      "You can type naturally (example: “My age is 20, mom 45, dad 50, blood cells 4.7, white blood cells 7.9”).\n\n" +
      "Required:\n" +
      "• Blood cell count\n" +
      "• White blood cell count\n" +
      "• Patient age\n" +
      "• Mother's age\n" +
      "• Father's age\n\n" +
    "bot"
  );
};