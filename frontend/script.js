const chatContainer = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.querySelector('.chat-input button');

function appendMessage(text, className) {
  const div = document.createElement('div');
  div.classList.add('message', className);
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
  appendMessage(text, 'user-message');
  userInput.value = '';
  setInputDisabled(true);
  appendMessage('...', 'bot-message');
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await resp.json();
    const lastBot = Array.from(chatContainer.querySelectorAll('.bot-message')).pop();
    if (lastBot && lastBot.textContent === '...') lastBot.remove();
    appendMessage(data.reply || "Sorry, I couldn't process that.");
  } catch (err) {
    const lastBot = Array.from(chatContainer.querySelectorAll('.bot-message')).pop();
    if (lastBot && lastBot.textContent === '...') lastBot.remove();
    appendMessage('Network error. Please try again.', 'bot-message');
    console.error(err);
  } finally {
    setInputDisabled(false);
    userInput.focus();
  }
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

window.addEventListener('load', () => {
  appendMessage('Hello! I am your AI assistant. Please describe your symptoms or concerns.', 'bot-message');
});
