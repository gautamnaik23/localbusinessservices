// public/widget.js
console.log("🔥 widget.js loaded");
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM loaded");

  const socket = io();

  // ===============================
  // ELEMENTS
  // ===============================
  const launcher = document.getElementById("chat-launcher");
  const widget = document.getElementById("chat-widget");
  const closeBtn = document.getElementById("closeChat");
  console.log({
  launcher: document.getElementById("chat-launcher"),
  widget: document.getElementById("chat-widget"),
  closeBtn: document.getElementById("closeChat")
  });

  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("messageInput");
  const buttonEl = document.getElementById("sendButton");
  const typingEl = document.getElementById("typing");

  if (!launcher || !widget || !closeBtn) {
    console.error("❌ Chat elements not found");
    return;
  }

  // ===============================
  // SESSION DATA
  // DYNAMICALLY LOOKS AT URL FOR BUSINESS ID (e.g. ?business=demo_business)
  // PERSISTS THREAD ID IN LOCAL STORAGE FOR BETTER UX (doesn't reset on reload)
  // ===============================
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('business') || 'demo_business';

  let threadId = localStorage.getItem("threadId");
  if (!threadId) {
    threadId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    localStorage.setItem("threadId", threadId);
  }

  socket.emit("join-thread", threadId);

  // ===============================
  // UI TOGGLE
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
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ===============================
  // TYPING
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

  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ===============================
  // SOCKET EVENTS
  // ===============================
  socket.on("nudge", (data) => {
    addMessage(data.message, "bot");
  });

  socket.on("reply", (msg) => {
    hideTyping();
    addMessage(msg, "bot");
  });

});
