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
        {/* USAGE PANEL */}
      {/* MONTHLY PANEL */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 2px 10px rgba(32,40,64,0.07)",
        flex: 1.7,
        padding: 28,
        minWidth: 0,
        margin: "1.5rem"
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
