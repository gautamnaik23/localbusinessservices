// public/widget.js
// Frontend logic for the chat widget.
// This version sends a message to your backend and displays the response.

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("messageInput");
const buttonEl = document.getElementById("sendButton");

// Temporary static business ID for testing.
// Later this can be injected per business or per embed.
const businessId = "demo_business";

// Create a simple thread ID for the session.
// Later you may want to store this in localStorage so it persists.
const threadId = `thread_${Date.now()}`;

function addMessage(sender, text) {
  messagesEl.innerHTML += `<div><strong>${sender}:</strong> ${text}</div>`;
  messagesEl.scrollTop = messagesEl.scrollHeight;
  inputEl.focus();
}


buttonEl.addEventListener("click", async () => {
  // Get the user's typed message.
  const message = inputEl.value.trim();

  if (!message) return;
  // Show the user's message in the widget.
   addMessage('You', message);  // ✅ Use function
   inputEl.value = '';

  try {
    // Send the message to the backend webhook.
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

    // Show the backend response for now.
    addMessage('AI', data.reply || JSON.stringify(data));
  } catch (err) {
    console.error("Widget request failed:", err);
    addMessage('AI', 'Error - check console');
  }

});

const socket = io();  // Connect
socket.emit('join-thread', threadId);

socket.on('nudge', (data) => {
  console.log('🔔 Nudge:', data.message);
  addMessage('AI', data.message);  // Auto-show!
});