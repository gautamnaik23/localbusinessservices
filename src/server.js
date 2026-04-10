import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import widgetRoutes from "./routes/widget.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/webhook/widget", widgetRoutes);

app.get("/", (req, res) => {
  res.send("AI receptionist backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
