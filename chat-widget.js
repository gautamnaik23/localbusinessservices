// chat-widget.js – embeddable AI chat widget with fresh thread each visit

(function () {
  "use strict";

  // NEW thread on every page load
  const threadId = "thread-" + Math.random().toString(36).substr(2, 9);

  // Read config from script tag
  const script = document.currentScript;
  const apiKey = script.getAttribute("data-api-key") || "default-key";
  const apiUrl = script.getAttribute("data-api-url") || "https://hook.us2.make.com/kkyfx0yc5b82h9qpqo6v6hecdlxms0qb";
  const businessId = script.getAttribute("data-business-id") || "unknown-business";
  const title = script.getAttribute("data-title") || "Chat with us";
  const welcome = script.getAttribute("data-welcome-message") || "Hi! Ask me anything about this business.";
  const placeholder = script.getAttribute("data-input-placeholder") || "Type your question...";

  let chatWidget = null;
  let chatMessages = null;
  let chatInput = null;
  let chatSend = null;

  function createWidget() {
  const container = document.createElement("div");
  container.id = "chat-widget-container";
  container.innerHTML = `
    <div id="chatWidget" style="position: fixed; bottom: 40px; right: 40px; width: 360px; height: 440px; border: 6px solid red; border-radius: 16px; box-shadow: 0 8px 24px rgba(255,0,0,0.3); background: #ffe6e6; overflow: hidden; z-index: 10000; display: none;">
      <div id="chatHeader" style="padding: 20px 24px; background: #d32f2f; color: white; font-size: 18px; font-weight: 600;">${title}</div>
      <div id="chatMessages" style="height: 300px; padding: 20px 24px; overflow-y: auto; font-size: 16px; color: #333; background: #fff;"></div>
      <div id="chatInputContainer" style="display: flex; padding: 16px 20px; border-top: 3px solid #d32f2f;">
        <input id="chatInput" type="text" placeholder="${placeholder}" style="flex-grow: 1; padding: 12px 16px; border: 2px solid #d32f2f; border-radius: 20px; font-size: 16px; background: #fff;" />
        <button id="chatSend" style="margin-left: 10px; padding: 0 20px; border: none; background: #d32f2f; color: white; border-radius: 20px; font-size: 16px; cursor: pointer;">Send</button>
      </div>
    </div>
    <div id="chatToggle" style="position: fixed; bottom: 40px; right: 40px; width: 64px; height: 64px; background: #d32f2f; border-radius: 32px; box-shadow: 0 8px 24px rgba(255,0,0,0.4); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; z-index: 10001;">💬</div>
  `;

    document.body.appendChild(container);

    chatWidget = document.getElementById("chatWidget");
    chatMessages = document.getElementById("chatMessages");
    chatInput = document.getElementById("chatInput");
    chatSend = document.getElementById("chatSend");
    const chatToggle = document.getElementById("chatToggle");

    addMessage(welcome, "ai");

    // Toggle open/close
    chatToggle.addEventListener("click", () => {
      chatWidget.style.display =
        chatWidget.style.display === "block" ? "none" : "block";
    });

    // Send message
    chatSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  function addMessage(text, role, id = null) {
    const p = document.createElement("p");
    p.className = `chat-message ${role}`;
    if (id) p.id = id;
    p.textContent = text;
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    chatInput.value = "";

    const tempId = "temp-" + Date.now();
    addMessage("...", "ai", tempId);

    // POST to Make webhook with threadId
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        message: text,
        businessId: businessDrawId,
        threadId: threadId,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("HTTP error: " + response.status);
        return response.json();
      })
      .then((data) => {
        const tempEl = document.getElementById(tempId);
        if (tempEl) {
          tempEl.textContent = data.reply || "I'm not sure how to help.";
        }
      })
      .catch((err) => {
        console.error(err);
        const tempEl = document.getElementById(tempId);
        if (tempEl)
          tempEl.textContent = "Sorry, something went wrong.";
      });
  }

  // Bootstrap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
