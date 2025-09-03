import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./index.css";
import DashboardPanel from "./system_alert";
import DynamicBarChart from "./dynamicChart";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "./Sidebar";

// Example data for the chart
const chartData = [
  { time: "6:00", water: 400, efficiency: 100 },
  { time: "8:00", water: 700, efficiency: 90 },
  { time: "10:00", water: 1050, efficiency: 80 },
  { time: "12:00", water: 1300, efficiency: 75 },
  { time: "14:00", water: 1050, efficiency: 80 },
  { time: "16:00", water: 700, efficiency: 90 },
  { time: "18:00", water: 600, efficiency: 100 },
];

const initialRemotes = [
  { name: "Building A", active: true },
  { name: "Building B", active: false },
];

// Water Tank component with SVG visualization
function WaterTank({ name, level, capacity, onFill, onDrain, remotes }) {
  const height = 180;
  const width = 80;
  const fillPercent = level / capacity;
  const waterHeight = height * fillPercent;

  // Find the remote corresponding to this tank name
  const remote = remotes.find((r) => r.name === name);

  return (
    <div style={{ margin: 20, display: "inline-block", textAlign: "center" }}>
      <svg
        width={width}
        height={height + 10}
        style={{ background: "#f0f0f0", borderRadius: 12 }}
      >
        <rect
          x={10}
          y={10}
          width={width - 20}
          height={height}
          rx={12}
          fill="#a3a3a3"
          stroke="#333"
        />
        {/* Water fill */}
        <rect
          x={10}
          y={10 + height - waterHeight}
          width={width - 20}
          height={waterHeight}
          rx={fillPercent === 1 ? 12 : 0}
          fill="#00bfff"
        />
      </svg>
      <div style={{ marginTop: 8 }}>
        <b>{name}</b>
        <div>
          {level} / {capacity} L
        </div>
        {/* <button style={{ margin: 2 }} onClick={onFill}>
            Fill +10L
          </button> */}
        {/* <button style={{ margin: 2 }} onClick={onDrain}>
            Drain -10L
          </button> */}
      </div>
    </div>
  );
}

// Main component
export default function FacilityDashboard() {
  const [remotes, setRemotes] = useState(initialRemotes);
  const [fill, setFill] = useState(0);
  const [drain, setDrain] = useState(0);

  useEffect(() => {
    // Increment water levels every second
    const interval = setInterval(() => {
      setTanks((prevTanks) =>
        prevTanks.map((tank, i) => {
          if (tank.level < tank.capacity && remotes[i] && remotes[i].active) {
            // Increase water level by 5 litres per tick, limit to capacity
            return { ...tank, level: Math.min(tank.level + 10, tank.capacity) };
          }
          if (remotes[i] && remotes[i].active) {
            toast.success(`${tank.name} is full, please turn off the remote.`);
          }
          return tank;
        })
      );
    }, 5000); // 1000ms = 1 second

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [remotes]);

  const [tanks, setTanks] = useState(() => {
    const saved = localStorage.getItem("tanks");
    return saved
      ? JSON.parse(saved)
      : [
          { name: "Building A", level: 10, capacity: 100 },
          { name: "Building B", level: 10, capacity: 70 },
        ];
  });

  const [newTankName, setNewTankName] = useState("");
  const [newTankCapacity, setNewTankCapacity] = useState("");

  const toggleRemote = (index) => {
    setRemotes(
      remotes.map((item, i) =>
        i === index ? { ...item, active: !item.active } : item
      )
    );
  };

  const fillTank = (index) => {
    setTanks((tanks) =>
      tanks.map((tank, i) =>
        i === index && tank.level < tank.capacity
          ? { ...tank, level: Math.min(tank.level + 10, tank.capacity) }
          : tank
      )
    );
  };

  // Persist changes to localStorage whenever tanks or remotes change
  useEffect(() => {
    localStorage.setItem("tanks", JSON.stringify(tanks));
  }, [tanks]);

  const drainTank = (index) => {
    setTanks((tanks) =>
      tanks.map((tank, i) =>
        i === index && tank.level > 0
          ? { ...tank, level: Math.max(tank.level - 10, 0) }
          : tank
      )
    );
  };

  const addTank = () => {
    if (newTankName && newTankCapacity > 0) {
      if (!newTankName || Number(newTankName) <= 0)
        return toast.error("Enter valid name/capacity");

      const newTank = {
        name:newTankName,
        level: 0,
        capacity: Number(newTankCapacity),
        plumbers: [],
        location: {
          lat: 28.61 + Math.random() * 0.05,
          lng: 77.2 + Math.random() * 0.05,
        },
        leakActive: false,
      };

      setTanks((prev) => [...prev, newTank]);
      setRemotes((prev) => [...prev, {name: newTankName, active: true }]); // Add corresponding remote
      toast.success(`Added new tank: ${newTankName.trim()}`);
    } else {
      toast.error("Please enter a valid tank name and capacity");
    }
  };

  async function handleApiCall() {
    try {
      const response = await fetch("/api/water-usage");
      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      toast.success(`Water usage: ${data.usage} litres`);
    } catch (err) {
      toast.error("Could not fetch water usage");
    }
  }

  return (
    <div>
      <div className="dashboard">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{ fontWeight: 700, fontSize: "2.4rem", marginBottom: 2 }}
            >
              Facility Dashboard
            </h1>
            <div style={{ color: "#74829c" }}>
              Real-time water management & analytics
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div style={{ color: "#667085" }}>Total Usage Today</div>
            <div
              className="big-num"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              12,290{" "}
              <span style={{ fontSize: 18, fontWeight: 400 }}>litres</span>
              <span
                role="img"
                aria-label="water"
                style={{ fontSize: 28, marginLeft: 6 }}
              >
                💧
              </span>
            </div>
            <div className="inc">+2.3%</div>
          </div>
          <div className="stat-card">
            <div style={{ color: "#667085" }}>Efficiency Rate</div>
            <div
              className="big-num"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              94.2 <span style={{ fontSize: 18, fontWeight: 400 }}>%</span>
              <span
                role="img"
                aria-label="up"
                style={{ fontSize: 24, color: "#22c55e" }}
              >
                📈
              </span>
            </div>
            <div className="inc">+5.1%</div>
          </div>
          <div className="stat-card">
            <div style={{ color: "#667085" }}>Active Outlets</div>
            <div
              className="big-num"
              style={{ display: "flex", alignItems: "baseline", gap: 4 }}
            >
              {remotes.filter(r => r.active).length} <span style={{ fontSize: 17, fontWeight: 400 }}>of {remotes.length}</span>
            </div>
            <div style={{ color: "#9ca3af", fontWeight: 500, fontSize: 14 }}>
              No change
            </div>
          </div>
          <div className="stat-card">
            <div style={{ color: "#667085" }}>Cost Saved</div>
            <div
              className="big-num"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              ₹20,584{" "}
            </div>
            <div className="inc">+₹1,494</div>
          </div>
        </div>

        {/* Main content row */}
        <div className="system-row" style={{ display: "flex", gap: 30 }}>
          {/* Left Side - Chart */}
          <div className="chart-area" style={{ flex: 2 }}>
            <div
              style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
            >
              <span
                role="img"
                aria-label="chart"
                style={{ fontSize: 22, marginRight: 6 }}
              >
                📊
              </span>
              <span style={{ fontWeight: 600, fontSize: 17 }}>
                Real-Time Water Usage & Efficiency
              </span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 18, left: 2, bottom: 0 }}
              >
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 3" />
                <XAxis dataKey="time" stroke="#74829c" />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  domain={[0, 1400]}
                  stroke="#74829c"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="#f59e42"
                />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="water"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#f59e42"
                  strokeWidth={3}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Right Side - Remote Controls */}
          <div className="controls-card" style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                role="img"
                aria-label="power"
                style={{ fontSize: 21, marginRight: 8 }}
              >
                ⏻
              </span>
              <span style={{ fontWeight: 600, fontSize: 17 }}>
                Remote Controls
              </span>
            </div>
            {remotes.map((item, idx) => (
              <div className="remote-line" key={item.name}>
                <span>
                  <span
                    className={`dot ${item.active ? "active" : "inactive"}`}
                  ></span>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 14,
                      color: item.active ? "#22c55e" : "#a9adc1",
                      fontWeight: 500,
                    }}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </span>
                <div
                  className={`toggle-switch${item.active ? " active" : ""}`}
                  onClick={() => toggleRemote(idx)}
                  style={{ cursor: "pointer" }}
                >
                  <span className="toggle-circle" />
                  <input type="checkbox" checked={item.active} readOnly />
                </div>
              </div>
            ))}
            <button
              className="shutdown-btn"
              style={{
                marginTop: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 19 }}>⏹️</span> Emergency Shutdown
            </button>
          </div>
        </div>

        {/* Water Tanks section */}
        <div style={{ marginTop: 50 }}>
          <h2>Water Tanks</h2>
          <div>
            {tanks.map((tank, idx) => (
              <WaterTank
                key={idx}
                name={tank.name}
                level={tank.level}
                capacity={tank.capacity}
                onFill={() => fillTank(idx)}
                onDrain={() => drainTank(idx)}
                remotes={remotes}
              />
            ))}
          </div>
          {/* Add new tank */}
          <div style={{ marginTop: 30 }}>
            <input
              type="text"
              placeholder="New Tank Name"
              value={newTankName}
              onChange={(e) => setNewTankName(e.target.value)}
              style={{ marginRight: 6 }}
            />
            <input
              type="number"
              placeholder="Capacity (L)"
              min={1}
              value={newTankCapacity}
              onChange={(e) => setNewTankCapacity(e.target.value)}
              style={{ marginRight: 6 }}
            />
            <button onClick={addTank}>Add New Tank</button>
          </div>
        </div>
      </div>
      <DashboardPanel />
    </div>
  );
}
