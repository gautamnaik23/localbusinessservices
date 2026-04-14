// src/server.js
// Main entry point for the backend.
// This file creates the Express app, sets up middleware,
// serves static files, and registers webhook routes.

import './services/scheduler.js';  // 🔥 Starts crons
import dotenv from "dotenv";
import telegramRoutes from './routes/telegram.js';
dotenv.config();


import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";           // ✅ HTTP server
import { Server } from "socket.io";            // ✅ WebSockets

import widgetRoutes from "./routes/widget.js";
import { startFollowUpJob } from './jobs/followups.js';


const app = express();
const PORT = process.env.PORT || 3000;

// Recreate __dirname in ES module syntax.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow requests from the browser widget and other frontends.
app.use(cors());

// Parse incoming JSON and form data.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//making sure it's correct
app.use('/webhook/telegram', (req, res, next) => {
  console.log('🔍 TELEGRAM HIT:', JSON.stringify(req.body).slice(0, 200));
  next();  // Pass to real route
});

// Serve files from the public folder, like widget.html, widget.js, and widget.css.
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// Register the widget webhook route.
app.use("/webhook/widget", widgetRoutes);

// Telegram Webhook
app.use('/webhook/telegram', telegramRoutes);

// Simple health check so you can confirm the backend is alive.
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Default homepage response.
app.get("/", (req, res) => {
  res.send("AI receptionist backend is running.");
});

// 🚀 WEBSOCKETS + HTTP SERVER
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors: { origin: '*' } 
});

io.on('connection', (socket) => {
  console.log('✅ Widget connected:', socket.id);
  socket.on('join-thread', (threadId) => {
    socket.join(threadId);
    console.log(`Widget joined: ${threadId}`);
  });
});

// Export io for followups
export { io };

// Catch-all for debugging  
app.use('*', (req, res) => {
  console.log('❌ 404:', req.method, req.path);
  res.status(404).send('Not found');
});

startFollowUpJob();  // 🔥 Starts cron

import './services/scheduler.js';  // 🔥 Starts crons

// Start the server.
httpServer.listen(PORT, () => {
  console.log(`🚀 Server + WebSockets on port ${PORT}`);
});
