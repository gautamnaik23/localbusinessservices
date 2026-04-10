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

buttonEl.addEventListener("click", async () => {
  // Get the user's typed message.
  const message = inputEl.value.trim();

  if (!message) return;

  // Show the user's message in the widget.
  messagesEl.innerHTML += `<div><strong>You:</strong> ${message}</div>`;

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
    messagesEl.innerHTML += `<div><strong>Bot:</strong> ${JSON.stringify(data)}</div>`;
  } catch (err) {
    console.error("Widget request failed:", err);
    messagesEl.innerHTML += `<div><strong>Bot:</strong> Error sending message.</div>`;
  }

  // Clear the input after sending.
  inputEl.value = "";
});
