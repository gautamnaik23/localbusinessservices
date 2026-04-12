// src/server.js
// Main entry point for the backend.
// This file creates the Express app, sets up middleware,
// serves static files, and registers webhook routes.

import dotenv from "dotenv";
dotenv.config();


import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import widgetRoutes from "./routes/widget.js";

// DEBUG .env LOADING
//console.log('📂 ROOT:', process.cwd());
//console.log('📄 FILES:', fs.readdirSync('.').filter(f => f.includes('.env')));
//console.log('🔑 CLIENT:', !!process.env.GOOGLE_CLIENT_EMAIL ? '✅' : '❌');
//console.log('🔑 KEY:', !!process.env.GOOGLE_PRIVATE_KEY ? '✅' : '❌');


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

// Serve files from the public folder, like widget.html, widget.js, and widget.css.
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// Simple health check so you can confirm the backend is alive.
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Register the widget webhook route.
app.use("/webhook/widget", widgetRoutes);

// Default homepage response.
app.get("/", (req, res) => {
  res.send("AI receptionist backend is running.");
});

// Start the server.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
