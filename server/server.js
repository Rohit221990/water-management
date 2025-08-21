import express from "express";
import fs from "fs/promises";
import path from "path";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(cors()); // Enable CORS for all routes

const DB_PATH = path.join(process.cwd(), "db.json");

async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Write failed:", error);
    throw error;
  }
}

// Helper to read JSON data
async function readDB() {
  try {
    const json = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(json);
  } catch {
    return { waterLevels: [], pumpStatus: { id: 1, on: false } };
  }
}

// GET latest water level
app.get("/api/water-level", async (req, res) => {
  const db = await readDB();
  const history = db.waterLevels || [];
  const latest = history.length ? history[history.length - 1].level : 0;
  res.json({ level: latest });
});

// POST new water level
app.post("/api/water-level", async (req, res) => {
  const { level } = req.body;
  if (typeof level !== "number")
    return res.status(400).json({ error: "Level must be a number" });

  const db = await readDB();
  db.waterLevels = db.waterLevels || [];
  db.waterLevels.push({ id: Date.now(), level, timestamp: Date.now() });

  try {
    await writeDB(db);
    return res.json({ success: true, level });
  } catch (error) {
    res.status(500).json({ error: "Failed to save data" });
  }
});

// GET pump status
app.get("/api/pump-status", async (req, res) => {
  const db = await readDB();
  const pumpStatus = db.pumpStatus || { id: 1, on: false };
  res.json(pumpStatus);
});

app.get("/api/alerts", async (req, res) => {
  const db = await readDB();
  console.log("Fetching alerts from DB", db);
  const alerts = db.alerts;

  res.json(alerts);
});

app.get("/api/monthly-stats", async (req, res) => {
  const db = await readDB();
  const monthlyStats = db.monthlyStats;
  res.json(monthlyStats);
});

// POST pump control
app.post("/api/pump-control", async (req, res) => {
  const { pumpOn } = req.body;
  console.log(`Pump control request: ${pumpOn}`);
  if (typeof pumpOn !== "boolean")
    return res.status(400).json({ error: "Invalid pump status" });
  const db = await readDB();
  db.pumpStatus = { id: 1, pumpOn };
  await writeDB(db);
  res.json({ success: true, pumpStatus: db.pumpStatus });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
