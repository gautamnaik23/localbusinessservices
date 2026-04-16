// =====================================================
// src/server.js - MAIN ENTRY POINT
// =====================================================
// Creates Express app + Socket.IO + ALL routes + cron jobs
// Everything starts here!

import dotenv from "dotenv";           // 1️⃣ LOAD .env FIRST (API keys!)
dotenv.config();

import express from 'express';         // 2️⃣ Core web framework
import cors from 'cors';               // 3️⃣ Allow frontend requests
import path from "path";               // 4️⃣ File paths (public folder)
import { fileURLToPath } from "url";   // 5️⃣ Fix __dirname in ES modules
import { createServer } from "http";   // 6️⃣ HTTP server (Express + Socket.IO)
import { Server } from "socket.io";    // 7️⃣ WebSocket server (widget realtime)


// =====================================================
// IMPORT ALL ROUTERS
// =====================================================
import telegramRoutes from './routes/telegram.js'; 
import widgetRoutes from "./routes/widget.js";

// =====================================================
// IMPORT JOBS (Run after server starts)
// =====================================================
import { startFollowUpJob } from "./jobs/followups.js";

const app = express();
const PORT = process.env.PORT || 3000;  // Render uses process.env.PORT

// =====================================================
// FIX ES MODULES (Needed for public folder)
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// MIDDLEWARE (Order matters! JSON first, routes after)
// =====================================================
// ✅ CORS: Allow widget.html from any domain
app.use(cors());
// ✅ JSON: Parse incoming POST bodies (Telegram webhooks)
app.use(express.json());
// ✅ URL-encoded: Parse form data (widget forms)
app.use(express.urlencoded({ extended: true }));

// =====================================================
// SERVE STATIC FILES (Widget HTML/CSS/JS)
// =====================================================
// Serve public/widget.html at /public/widget.html
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// =====================================================
// WEBHOOK ROUTES
// =====================================================
app.use("/webhook/widget", widgetRoutes);
app.use("/webhook/telegram", telegramRoutes);

// =====================================================
// HEALTH CHECK + HOMEPAGE
// =====================================================
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("AI receptionist backend is running.");
});

app.use("*", (req, res) => {
  console.log("❌ 404:", req.method, req.path);
  res.status(404).send("Not found");
});

// =====================================================
// SOCKET.IO (Widget realtime updates)
// =====================================================
// ✅ CREATE HTTP SERVER (Express + Socket.IO share port)
const httpServer = createServer(app);
// ✅ SOCKET.IO on SAME server
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// ✅ HANDLE WIDGET CONNECTIONS
io.on("connection", (socket) => {
  console.log("✅ Widget connected:", socket.id);
  socket.on("join-thread", (threadId) => {
    socket.join(threadId);
    console.log(`Widget joined: ${threadId}`);
  });
});

// ✅ EXPORT for other files (followups.js needs this)
export { io };

// =====================================================
// START JOBS (After server ready)
// =====================================================
// ✅ Cron jobs (follow-up emails/texts)
//startFollowUpJob();


// =====================================================
// START SERVER 🚀
// =====================================================
httpServer.listen(PORT, () => {
  console.log(`🚀 Server + WebSockets on port ${PORT}`);
  // ✅ START SCHEDULER LAST (needs server ready)
  import("./services/scheduler.js");
});
