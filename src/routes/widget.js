// src/routes/widget.js
// This route receives messages from the website chat widget.
// For now it only validates the request and echoes the data back.
// Later it will load business config, conversation history,
// call Gemini, save the messages, and return a real AI response.

import { Router } from "express";

const router = Router();

router.post("/", async (req, res) => {
  try {
    // Pull the key fields sent by the widget frontend.
    const { business_id, thread_id, message } = req.body;

    // Make sure the minimum required data is present.
    if (!business_id || !thread_id || !message) {
      return res.status(400).json({
        error: "Missing required fields: business_id, thread_id, message"
      });
    }

    // Temporary response until AI + Sheets logic is wired up.
    res.json({
      ok: true,
      received: {
        business_id,
        thread_id,
        message
      }
    });
  } catch (err) {
    console.error("Widget route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
