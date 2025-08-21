import React, { useState } from "react";
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
  { name: "Garden", active: true },
  { name: "Lab", active: true },
];

export default function FacilityDashboard() {
  const [remotes, setRemotes] = useState(initialRemotes);

  const toggleRemote = (index) => {
    setRemotes(
      remotes.map((item, i) =>
        i === index ? { ...item, active: !item.active } : item
      )
    );
  };

  return (
    <>
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
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#fff",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              ⟳ Refresh
            </button>
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
              3 <span style={{ fontSize: 17, fontWeight: 400 }}>of 4</span>
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
              <span style={{ color: "#a5a5aa", fontSize: 17, fontWeight: 400 }}>
                this month
              </span>
              <span
                role="img"
                aria-label="lightning"
                style={{ fontSize: 30, color: "#8b5cf6" }}
              >
                ⚡
              </span>
            </div>
            <div className="inc">+₹1,494</div>
          </div>
        </div>

        {/* Main content row */}
        <div className="system-row">
          {/* Left Side - Chart */}
          <div className="chart-area">
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
          <div className="controls-card">
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
      </div>
      <DashboardPanel />
    </>
  );
}
