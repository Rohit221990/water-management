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
    const data = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading DB file:", err);
    // Return default if error reading file
    return {
      waterLevels: [],
      pumpStatus: {},
      alerts: [],
      monthlyStats: [],
    };
  }
}

// GET latest water level
app.get("/api/water-level", async (req, res) => {
  const db = await readDB();
  const history = db.waterLevels || [];
  res.json(history);
});

async function updateWaterLevels() {
  try {
    // Read current DB
    const db = await readDB();
    console.log("Current DB:", db);
    // Sample update: increment level by 5 capped at capacity
    const updatedWaterLevels = db.waterLevels.map((tank) => {
      let newLevel = tank.level + 5;
      if (newLevel > tank.capacity) newLevel = tank.capacity;
      return { ...tank, level: newLevel };
    });

    // Update waterLevels in the db object
    db.waterLevels = updatedWaterLevels;

    // Write updated DB back to file
    await writeDB(db);

    console.log("DB updated with new water levels:", updatedWaterLevels);
  } catch (err) {
    console.error("Failed to update water levels:", err);
  }
}

setInterval(updateWaterLevels, 5000);

// POST new water level
app.post("/api/water-level", async (req, res) => {
  try {
    const { waterLevels } = req.body; // Expecting array of tanks from client

    if (!Array.isArray(waterLevels)) {
      return res.status(400).json({ error: "Invalid waterLevels data" });
    }

    // Read current DB
    const db = await readDB();

    // Update existing water levels or store new one
    db.waterLevels = waterLevels;

    // Save updated DB
    await writeDB(db);

    res.json({ message: "Water levels updated successfully" });
  } catch (error) {
    console.error("Error updating water levels:", error);
    res.status(500).json({ error: "Internal server error" });
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
