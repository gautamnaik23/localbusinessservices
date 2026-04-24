// public/widget.js

const socket = io();

// ===============================
// ELEMENTS
// ===============================
const launcher = document.getElementById("chat-launcher");
const widget = document.getElementById("chat-widget");
const closeBtn = document.getElementById("closeChat");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("messageInput");
const buttonEl = document.getElementById("sendButton");
const typingEl = document.getElementById("typing");

// ===============================
// SESSION DATA
// CHANGE LATER FOR EACH BUSINESS/USER
// ===============================
const businessId = "demo_business";

// Persist thread across reloads (important UX upgrade)
let threadId = localStorage.getItem("threadId");
if (!threadId) {
  threadId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  localStorage.setItem("threadId", threadId);
}

// Join socket room
socket.emit("join-thread", threadId);

// ===============================
// UI TOGGLE (launcher)
// ===============================
launcher.onclick = () => {
  widget.classList.toggle("hidden");
};

closeBtn.onclick = () => {
  widget.classList.add("hidden");
};

// ===============================
// MESSAGE RENDERING
// ===============================
function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.innerText = text;

  messagesEl.appendChild(div);

  // Auto-scroll
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ===============================
// TYPING INDICATOR
// ===============================
function showTyping() {
  typingEl.classList.remove("hidden");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  typingEl.classList.add("hidden");
}

// ===============================
// SEND MESSAGE
// ===============================
async function sendMessage() {
  const message = inputEl.value.trim();
  if (!message) return;

  // Show user message
  addMessage(message, "user");
  inputEl.value = "";

  showTyping();

  try {
    const res = await fetch("/webhook/widget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        business_id: businessId,
        thread_id: threadId,
        message
      })
    });

    const data = await res.json();

    hideTyping();

    addMessage(data.reply || "No response", "bot");

  } catch (err) {
    console.error("Widget request failed:", err);
    hideTyping();
    addMessage("Something went wrong. Please try again.", "bot");
  }
}

// ===============================
// EVENTS
// ===============================
buttonEl.onclick = sendMessage;

// Enter key support
inputEl.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ===============================
// SOCKET EVENTS (nudges)
// ===============================
socket.on("nudge", (data) => {
  console.log("🔔 Nudge:", data.message);
  addMessage(data.message, "bot");
});

// Optional: real-time reply (if you add this later)
socket.on("reply", (msg) => {
  hideTyping();
  addMessage(msg, "bot");
});