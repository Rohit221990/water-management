import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const levelColors = {
  high: "#fee2e2",
  medium: "#fef9c3",
  low: "#e0e7ff"
};
const borderColors = {
  high: "#fca5a5",
  medium: "#fde68a",
  low: "#c7d2fe"
};

export default function DashboardPanel() {
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch alerts
    fetch("http://localhost:5000/api/alerts")
      .then(res => res.json())
      .then(setAlerts);

    // Fetch chart data
    fetch("http://localhost:5000/api/monthly-stats")
      .then(res => res.json())
      .then(setChartData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: "flex", gap: 24 }}>
      {/* ALERTS PANEL */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 2px 10px rgba(32,40,64,0.07)",
        flex: 1.1,
        padding: 28,
        minWidth: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 23, marginRight: 8 }}>⚠️</span>
          <span style={{ fontWeight: 700, fontSize: 19 }}>System Alerts</span>
          <span style={{
            background: "#dc2626",
            color: "white",
            marginLeft: 12,
            fontSize: 15,
            borderRadius: 8,
            fontWeight: 600,
            padding: "4px 16px"
          }}>
            {alerts.filter(a => a.level === "high").length} Critical
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {alerts.map(alert => (
            <div key={alert.id}
              style={{
                borderRadius: 12,
                padding: "18px 16px 16px 16px",
                background: levelColors[alert.level],
                border: `2px solid ${borderColors[alert.level]}`,
                marginBottom: 0,
                display: "flex",
                flexDirection: "column"
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 19 }}>⚠️</span>
                <span style={{ flex: 1, fontWeight: 500, fontSize: 16 }}>{alert.message}</span>
                <a href="#resolve" style={{
                  color: "#333", fontWeight: 500,
                  fontSize: 15, textDecoration: "underline", marginLeft: 14
                }}>Resolve</a>
              </div>
              <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#666", fontSize: 15 }}>{alert.time}</span>
                <span style={{
                  background: "#f5f5f5",
                  color: "#222",
                  fontWeight: 500,
                  fontSize: 15,
                  borderRadius: 8,
                  padding: "2px 12px"
                }}>
                  {alert.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MONTHLY PANEL */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 2px 10px rgba(32,40,64,0.07)",
        flex: 1.7,
        padding: 28,
        minWidth: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 22, marginRight: 7 }}>🗓️</span>
          <span style={{ fontWeight: 600, fontSize: 18 }}>
            Monthly Comparison & Savings
          </span>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" stroke="#74829c" />
            <YAxis stroke="#74829c" />
            <Bar dataKey="last" fill="#a3a3a3" barSize={24} radius={[8, 8, 0, 0]} />
            <Bar dataKey="current" fill="#3b82f6" barSize={24} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{
          marginTop: 20,
          background: "#dcfce7",
          color: "#166534",
          borderRadius: 13,
          padding: "18px 24px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 17
        }}>
          <div>
            23% reduction compared to last year<br />
            <span style={{ fontWeight: 400, fontSize: 15, color: "#166534" }}>
              Total saved: 7,572 litres
            </span>
          </div>
          <span style={{
            background: "#f0fdf4",
            color: "#166534",
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 9,
            padding: "6px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            🎯 Target Met
          </span>
        </div>
      </div>
    </div>
  );
}
