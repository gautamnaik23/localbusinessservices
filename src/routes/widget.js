// src/routes/widget.js - FULL VERSION
import { Router } from "express";
import { saveMessagesBatch } from "../services/messages.js";
import { getBusinessConfig } from "../services/business.js";
import { getThreadHistory } from "../services/messages.js";
import { generateReply } from "../services/ai.js";
import { generateSessionId } from "../utils/ids.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { business_id, thread_id, message } = req.body;
    if (!business_id || !thread_id || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Generate session ID (040926 format)
    const sessionId = generateSessionId();

    // 2. Load business config FIRST
    const business = await getBusinessConfig(business_id);

    // 3. Load conversation history (EXCLUDES current message)
    const history = await getThreadHistory(business_id, thread_id, sessionId);

    // 4. Generate real AI reply using your prompt
    const aiResponse = await generateReply({
      business,
      history, 
      userMessage: message
    });

    //Save user and AI messages
    await saveMessagesBatch(business_id, thread_id, [
  {role: 'user', text: message, replyNeeded: false, followUp: false},
  {role: 'ai', text: aiResponse.message, replyNeeded: aiResponse.expecting_reply, followUp: false}
], 'widget');


    // 7. Return CLEAN reply text to widget (no JSON wrapper)
    res.json({ 
      ok: true, 
      reply: aiResponse.message 
    });

  } catch (err) {
    console.error("Widget error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
