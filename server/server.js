import express from "express";
import fs from "fs/promises";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import http from "http";
import auth from "./routes/auth.js";
import leaks from "./routes/leaks.js";
import plumbers from "./routes/plumbers.js";
import services from "./routes/services.js";
import payments from "./routes/payments.js";
import iot from "./routes/iot.js";
import twilio from "twilio";
import qs from "qs";
import axios from "axios";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-staff", (staffId) => {
    socket.join(`staff-${staffId}`);
    console.log(`Staff ${staffId} joined room`);
  });

  socket.on("join-plumber", (plumberId) => {
    socket.join(`plumber-${plumberId}`);
    console.log(`Plumber ${plumberId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io available globally
app.set("io", io);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/aquaflow")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", auth);
app.use("/api/leaks", leaks);
app.use("/api/plumbers", plumbers);
app.use("/api/services", services);
app.use("/api/payments", payments);
app.use("/api/iot", iot);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "AquaFlow API is running",
    timestamp: new Date().toISOString(),
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to AquaFlow - Complete Water Management Solution",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      leaks: "/api/leaks",
      plumbers: "/api/plumbers",
      services: "/api/services",
      payments: "/api/payments",
      iot: "/api/iot",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? {} : err.message,
  });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("send_message", (message) => {
    console.log("Message received:", message);
    // Broadcast message to all clients except sender
    socket.broadcast.emit("receive_message", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const forecastAlgo = (season) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const base = season === "summer" ? 100 : 50;
  const seasonalAmp = season === "summer" ? 30 : 15;
  const trend = season === "summer" ? 1.2 : 0.8;

  return months.map((m, i) => {
    const seasonal = seasonalAmp * Math.sin(((i + 2) / 12) * Math.PI * 2);
    const noise = Math.random() * 8;
    return {
      month: m,
      demand: Math.round(base + i * trend + seasonal + noise),
    };
  });
};

app.get("/forecast", (req, res) => {
  const season = req.query.season || "summer";
  res.json(forecastAlgo(season));
});

const accountSid =
  process.env.TWILIO_ACCOUNT_SID; // Your Account SID
const authToken =
  process.env.TWILIO_AUTH_TOKEN ; // Your Auth Token
const whatsappFrom =
  process.env.TWILIO_WHATSAPP_NUMBER; // Sandbox
const smsFrom = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

async function sendMessage(to, body, type = "sms") {
  try {
    const from = type === "whatsapp" ? whatsappFrom : smsFrom;
    const toFormatted = type === "whatsapp" ? `whatsapp:${to}` : to;

    const message = await client.messages.create({
      from,
      to: toFormatted,
      body,
    });

    console.log("Message sent! SID:", message.sid);
  } catch (err) {
    console.error("Twilio Error:", err.message);
  }
}

app.post("/send-leak-alert", async (req, res) => {
  const { tankName, plumbers } = req.body; // plumbers = array of {name, number, type}
  const result = await sendMessage("+918441919957", "Leak detected in Building A!", "sms");
  res.status(200).json({ message: result });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
