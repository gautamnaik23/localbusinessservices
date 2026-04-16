// src/routes/telegram.js - Receives Telegram webhook updates
import Router from 'express';
import { saveMessagesBatch, getThreadHistory } from '../services/messages.js';
import { getBusinessConfig } from '../services/business.js';
import { generateReply } from '../services/ai.js';
import { senders } from '../services/outbound.js';
import { generateSessionId } from "../utils/ids.js";
import { getThreadBusiness, saveThreadMapping} from '../services/sheets.js';

const router = Router();
console.log("entered telegram.js");

router.post('/', async (req, res) => {
  try {
    console.log("executing telegram.js")
    const update = req.body;
    
    // Telegram webhook payload
    const chatId = update.message?.chat.id;
    const userMessage = update.message?.text;
    // Telegram sends: /start demobusiness. Use this to parse out id
    // Get businessid from /start OR lookup by chatId
    let businessid;
    if (userMessage?.startsWith('/start ')) {
        businessid = userMessage.split(' ')[1];
        await saveThreadMapping(chatId, businessid);  // Save once
    } else {
        businessid = await getThreadBusiness(chatId);  // Lookup
        if (!businessid) businessid = 'demo_business';  // Fallback
        }
    const sessionId = generateSessionId();

    if (!chatId || !userMessage) {
      return res.status(400).json({ error: 'Missing chat.id or text' });
    }

    console.log(`📱 Telegram: ${chatId}: ${userMessage.slice(0, 50)}`);

    // 1. Load business config FIRST
    const business = await getBusinessConfig(businessid);

    // 3. Load conversation history (EXCLUDES current message)
    const history = await getThreadHistory(businessid, chatId, sessionId);

    // 4. Generate real AI reply using your prompt
    const aiResponse = await generateReply({
      business,
      history, 
      userMessage: userMessage
    });

    //Save user and AI messages
    await saveMessagesBatch(businessid, chatId.toString(), [
    {role: 'user', text: userMessage, replyNeeded: false, followUp: false},
    {role: 'ai', text: aiResponse.message, replyNeeded: aiResponse.expecting_reply, followUp: false}
    ], 'telegram');

    // Send reply back to Telegram
    await senders.telegram(chatId.toString(), aiResponse.message);

    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

