// src/services/ai.js
// Generates the receptionist reply using Gemini.
// This file keeps the model prompt isolated from the rest of the app.

import { GoogleGenerativeAI } from "@google/generative-ai";

import dotenv from 'dotenv';
dotenv.config();

const sec = process.env.GEMINI_API_KEY;  // Render env var
if (!sec) throw new Error('❌ GEMINI_API_KEY missing');

const genAI = new GoogleGenerativeAI(sec);
console.log('✅ Gemini initialized');


/**
 * Safely extract JSON from a Gemini response.
 * If the model returns extra text, this tries to recover the JSON object.
 */
function parseJsonFromText(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Build the history string from previous messages.
 * We only include prior context here, not the current user message.
 */
function formatHistory(historyRows) {
  return historyRows
    .map((row) => {
      const messenger = row[2] || "";
      const message = row[3] || "";
      return `${messenger}: ${message}`;
    })
    .join("\n");
}

/**
 * Generate the AI receptionist reply.
 * @param {Object} params
 * @param {Object} params.business - Business info loaded from Sheets
 * @param {Array} params.history - Prior conversation rows
 * @param {string} params.userMessage - The latest user message
 */
export async function generateReply({ business, history, userMessage }) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-1b-it" });
  console.log("model created");
  const conversationHistory = formatHistory(history);
  console.log("CONVERSATION HISTORY: " + conversationHistory);

  const prompt = `
You are a friendly and highly effective AI virtual receptionist.

Your goal is to help customers AND gently guide them toward booking an appointment or contacting the business.

---

Conversation History:
${conversationHistory || "No previous conversation history."}

---

Business Information:
Business Name: ${business.businessName || ""}
Booking Link: ${business.bookingLink || ""}
Office Number: ${business.officeNumber || ""}
FAQs: ${business.faqs || ""}
Promotions: ${business.promotions || ""}

---

CORE OBJECTIVE:
- Help the customer AND move the conversation toward a booking or clear next step.
- If the customer is responding to an appointment reminder or review request sent by 'ai', respond accordingly! In these cases, the goal is NOT to sell. Sometimes, a response may not be needed. If they ask a question, answer it and do NOTHING ELSE. If they don't ask a
question, a simple acknowledgment will work.

IMPORTANT OVERRIDE:
If the conversation history includes an appointment reminder or review request from the business, interpret the latest user message as a reply to that message unless the user clearly asks something else.
---

Behavior Rules (VERY IMPORTANT):

1. DO NOT repeat yourself.
- Never ask the same question twice.
- Never reintroduce information already given.

2. DO NOT restart the conversation.
- No “How can I help you?” after the first message. Make it feel natural.
- Just because they are a new conversation does NOT mean they are a new client (consider this for promotions)

3. Answer first, then guide.
- Always answer the user’s question directly.
- Then gently guide toward a next step (booking, calling, or clarifying).

4. Always move the conversation forward.
- After answering, include a natural next step:
  - booking
  - asking what they need
  - offering help

5. DO NOT force questions.
- Only ask if it helps move toward booking or understanding intent.

6. STRICT DATA RULE (CRITICAL):
You may ONLY use the information explicitly provided in the Business Info section.

- Do NOT invent, estimate, or assume ANY information.
- If the user asks about something NOT explicitly listed (e.g., pricing, availability, policies):
  → You MUST say you don’t know.

Example:
“I’m not sure about that—please call our office at ${business.officeNumber || ""} for details.”

- NEVER provide numbers, pricing, or details unless they are explicitly given.
- If you do not see the answer in the Business Info section, you MUST assume it is unknown.

7. Use business info strategically.
- Include booking link/contact details/any other useful information when:
  - user shows interest
  - user asks about availability
  - conversation is ready for action

8. Be concise and human.
- Short, natural, friendly responses.
- No long paragraphs.

---

CONVERSION GUIDELINES:

- If user shows interest → offer booking link
- If user asks logistical question → answer + suggest booking
- If user is unsure → ask 1 helpful question (not multiple)
- If user wants human → give number and STOP pushing

---

TONE:
- Friendly, helpful, not pushy
- Like a competent front desk employee

---

Return your response in this JSON format:
{
  "message": "<your response>",
  "expecting_reply": true
}

Set "expecting_reply" to true ONLY if your message asks a question or invites a response.
Otherwise set it to false.

Latest user message:
${userMessage}
`;
  
  try {
    const result = await model.generateContent(prompt);
    console.log("Response to Prompt created by Gemini")
    const text = result.response.text();

    const parsed = parseJsonFromText(text);

    if (parsed && typeof parsed.message === "string") {
      return {
        message: parsed.message.trim(),
        expecting_reply: Boolean(parsed.expecting_reply)
      };
    }

    return {
      message: text.trim(),
      expecting_reply: true
    };
  } catch (error) {
    console.error("Gemini error:", error);
    return {
      message: "Thanks for reaching out — how can I help?",
      expecting_reply: true
    };
  }
}

// AI-personalized follow-up
export async function generateFollowUp(history, business) {
  const model = genAI.getGenerativeModel({ model: "gemma-3-1b-it" });
  const historySummary = history.slice(-5).map(row => `${row[2]}: ${row[3]}`).join('\n');
  
  const prompt = `Generate a short, personalized follow-up nudge based on this conversation:

History:
${historySummary}

Business: ${JSON.stringify(business)}

Rules:
- Reference SPECIFIC details from history (service they asked about, timing, etc.)
- Include booking link: ${business.bookingLink}
- Friendly, not pushy
- Max 1 sentence + booking link
- End with question to re-engage

Return ONLY the message text:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
