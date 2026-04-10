// src/routes/widget.js - COMPLETE VERSION
import { Router } from "express";
import { saveMessage } from "../services/messages.js";
import { getBusinessConfig } from "../services/business.js";
import { getThreadHistory } from "../services/messages.js";
import { generateReply } from "../services/ai.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { business_id, thread_id, message } = req.body;

    if (!business_id || !thread_id ||  !message) {
      return res.status(400).json({
        error: "Missing required fields: business_id, thread_id, session_id, message"
      });
    }
    // Make Session Id
    session_id = generateSessionId();

    
    // 1. Load business config
    const business = await getBusinessConfig(business_id);
    
    // 2. Load conversation history
    const history = await getThreadHistory(business_id, thread_id, session_id);
    
    // 3. Generate AI reply
    const aiResponse = await generateReply({
      business,
      history,
      userMessage: message
    });
    
    // 4. Save user message
    await saveMessage(business_id, thread_id, session_id, "user", message, false, false);
    
    // 5. Save AI response
    await saveMessage(business_id, thread_id, session_id, "ai", aiResponse.message, aiResponse.replyNeeded, false);
    
    // 6. Return AI reply to widget
    res.json({
      ok: true,
      reply: aiResponse.message
    });
    
  } catch (err) {
    console.error("Widget route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Generate session ID as MMDDYYYY format
function generateSessionId() {
  const now = new Date();
  return now.toISOString().slice(5, 10).replace(/-/g, '') + now.getFullYear().toString().slice(-2);
}

export default router;
