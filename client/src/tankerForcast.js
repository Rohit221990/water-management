import React, { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

// Simple replacements for Card and Button components since @/components/ui/* is missing
const Card = ({ children, className }) => (
  <div className={`bg-white rounded-2xl shadow ${className}`}>{children}</div>
);

const CardContent = ({ children, className }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const Button = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
  >
    {children}
  </button>
);

export default function TankerDashboard() {
  const [season, setSeason] = useState("summer");
  const [forecast, setForecast] = useState([]);
  const [insights, setInsights] = useState("");

  const fetchData = async () => {
    const res = await fetch(`http://localhost:5000/forecast?season=${season}`);
    const data = await res.json();
    setForecast(data);
    generateInsights(data);
  };

  const generateInsights = (data) => {
    if (!data || data.length === 0) return;
    const total = data.reduce((a, b) => a + b.demand, 0);
    const avg = Math.round(total / data.length);
    const peak = data.reduce((prev, curr) => (curr.demand > prev.demand ? curr : prev), { month: "-", demand: 0 });
    const low = data.reduce((prev, curr) => (curr.demand < prev.demand ? curr : prev), { month: "-", demand: 9999 });

    const trend = data[0].demand < data[data.length - 1].demand ? "rising" : "falling";

    const summary = `For ${season}, the average tanker demand is ${avg} orders per month. The peak demand is expected in ${peak.month} (${peak.demand} orders), while the lowest demand is in ${low.month} (${low.demand} orders). Overall, the trend appears ${trend} over the months.`;

    setInsights(summary);
  };

  useEffect(() => {
    fetchData();
  }, [season]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* KPI Section */}
      <Card className="col-span-3 p-4 flex justify-around text-center">
        <div>
          <h2 className="text-lg font-semibold">Total Orders</h2>
          <p className="text-2xl font-bold text-blue-600">
            {forecast.reduce((a, b) => a + b.demand, 0)}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Peak Month</h2>
          <p className="text-xl text-green-600">
            {forecast.reduce((prev, curr) => (curr.demand > prev.demand ? curr : prev), { month: "-", demand: 0 }).month}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Forecast Season</h2>
          <p className="text-xl">{season}</p>
        </div>
      </Card>

      {/* Line Chart */}
      <Card className="col-span-2">
        <CardContent>
          <h2 className="text-lg font-bold mb-2">Forecasted Tanker Demand</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-bold mb-2">Monthly Demand Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="demand" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Insights Panel */}
      <Card className="col-span-3 p-6 bg-white">
        <h2 className="text-lg font-bold mb-2">AI Insights</h2>
        <p className="text-gray-700 leading-relaxed">{insights}</p>
      </Card>

      {/* Controls */}
      <Card className="col-span-3 p-4 flex justify-center gap-4">
        <select value={season} onChange={(e) => setSeason(e.target.value)} className="p-2 border rounded-xl">
          <option value="summer">Summer</option>
          <option value="winter">Winter</option>
        </select>
        <Button onClick={fetchData}>Refresh Forecast</Button>
      </Card>
    </div>
  );
}
