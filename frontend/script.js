const chatContainer = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.querySelector(".chat-input button");

function appendMessage(text, className) {
  const div = document.createElement("div");
  div.classList.add("message", className);
  div.textContent = text;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function setInputDisabled(state) {
  userInput.disabled = state;
  sendButton.disabled = state;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user-message");
  userInput.value = "";
  setInputDisabled(true);

  appendMessage("...", "bot-message");

  try {
    const resp = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    let data = {};
    try {
      data = await resp.json();
    } catch {
      data = {};
    }

    const lastBot = Array.from(chatContainer.querySelectorAll(".bot-message")).pop();
    if (lastBot && lastBot.textContent === "...") lastBot.remove();

    if (!resp.ok) {
      appendMessage(data.reply || `Server error (${resp.status}).`, "bot-message");
      return;
    }

    appendMessage(data.reply || "Sorry, I couldn't process that.", "bot-message");
  } catch (err) {
    const lastBot = Array.from(chatContainer.querySelectorAll(".bot-message")).pop();
    if (lastBot && lastBot.textContent === "...") lastBot.remove();

    appendMessage("Network error. Please try again.", "bot-message");
    console.error(err);
  } finally {
    setInputDisabled(false);
    userInput.focus();
  }
}

sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

window.addEventListener("load", () => {
  appendMessage(
    "Hello! I can help assess possible genetic disorder categories. Share any relevant details (age, parents' ages, lab counts, etc.).",
    "bot-message"
  );
});
