import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ---- Icons ----
const leakIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
  iconSize: [32, 32],
});
const normalIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
  iconSize: [32, 32],
});
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
  iconSize: [32, 32],
});

const TankSimulator = () => {
  const [tanks, setTanks] = useState([
    {
      name: "Building A",
      level: 10,
      capacity: 100,
      plumbers: [
        { name: "Ramesh", number: "+919876543210", type: "sms" },
        { name: "Suresh", number: "+919812345678", type: "sms" },
      ],
      location: { lat: 28.6139, lng: 77.209 },
      leakActive: false,
    },
    {
      name: "Building B",
      level: 20,
      capacity: 70,
      plumbers: [
        { name: "Mahesh", number: "+919999888777", type: "sms" },
      ],
      location: { lat: 28.6205, lng: 77.225 },
      leakActive: false,
    },
  ]);

  const [remotes, setRemotes] = useState(tanks.map(() => ({ active: false })));
  const [history, setHistory] = useState(tanks.map(() => []));
  const [userLocation, setUserLocation] = useState(null);


  // ---- Tank Simulation ----
  useEffect(() => {
    const interval = setInterval(() => {
      setTanks((prev) =>
        prev.map((tank, i) => {
          let updatedTank = { ...tank };

          if (remotes[i]?.active && updatedTank.level < updatedTank.capacity) {
            updatedTank.level = Math.min(
              updatedTank.level + 10,
              updatedTank.capacity
            );
          }

          const leakHappens = Math.random() < 0.05;
          if (leakHappens && !updatedTank.leakActive) {
            updatedTank.leakActive = true;
            updatedTank.level = Math.max(updatedTank.level - 10, 0);

            fetch("http://localhost:5000/send-leak-alert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tankName: updatedTank.name, plumbers: updatedTank.plumbers }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success)
                  data.results.forEach((r) => toast.info(`📨 ${r.plumber} notified!`));
              })
              .catch(console.error);

            toast.error(`🚨 Leak detected in ${updatedTank.name}!`);
          } else if (!leakHappens && updatedTank.leakActive) {
            updatedTank.leakActive = false;
          }

          setHistory((prevHist) => {
            const newHist = [...prevHist];
            const timestamp = new Date().toLocaleTimeString();
            if (!newHist[i]) newHist[i] = [];
            newHist[i] = [
              ...newHist[i],
              { time: timestamp, level: updatedTank.level },
            ].slice(-15);
            return newHist;
          });

          return updatedTank;
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [remotes]);

  const toggleRemote = (i) =>
    setRemotes(remotes.map((r, idx) => (idx === i ? { active: !r.active } : r)));

  const simulateLeak = (tankIndex) => {
    setTanks((prev) =>
      prev.map((tank, i) => {
        if (i !== tankIndex || tank.leakActive) return tank;

        toast.error(`💥 Simulated leak in ${tank.name}!`);
        fetch("http://localhost:5000/send-leak-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tankName: tank.name, plumbers: tank.plumbers }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success)
              data.results.forEach((r) => toast.info(`📨 ${r.plumber} notified!`));
          })
          .catch(console.error);

        return { ...tank, leakActive: true, level: Math.max(tank.level - 10, 0) };
      })
    );
  };

  const globalChartData =
    history[0]?.map((p, idx) => {
      const row = { time: p.time };
      history.forEach((h, tIdx) => (row[tanks[tIdx]?.name] = h[idx]?.level ?? null));
      return row;
    }) || [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">
          💧 Smart Water Monitoring – Demo
        </h1>
        <span className="text-gray-500">Live Dashboard</span>
      </header>

      <main className="p-6 space-y-8">
        {/* Global Chart */}
        <div className="p-4 border rounded shadow bg-white">
          <h2 className="text-lg font-semibold mb-2">🌍 Tank Levels Overview</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={globalChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                {tanks.map((t, i) => (
                  <Line
                    key={t.name}
                    dataKey={t.name}
                    stroke={["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#f59e0b"][i % 5]}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tanks Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {tanks.map((tank, i) => (
            <div key={i} className="p-4 border rounded shadow bg-white flex flex-col justify-between h-full">
              <div>
                <h2 className="text-xl font-semibold">{tank.name}</h2>
                <p className="mt-1 text-gray-700">
                  💧 Level: {tank.level}/{tank.capacity}
                </p>
                {tank.plumbers?.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-800">Plumbers:</h4>
                    <ul className="mt-1 space-y-1 text-gray-700 text-sm">
                      {tank.plumbers.map((p, idx) => (
                        <li key={idx}>
                          {p.name} ({p.type}) - {p.number}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    className={`flex-1 px-4 py-2 rounded shadow text-white font-semibold transition-all ${
                      remotes[i]?.active ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={() => toggleRemote(i)}
                  >
                    {remotes[i]?.active ? "Turn Off Remote" : "Turn On Remote"}
                  </button>

                  <button
                    className="flex-1 px-4 py-2 rounded shadow bg-red-600 hover:bg-red-700 text-white font-semibold transition-all"
                    onClick={() => simulateLeak(i)}
                  >
                    💥 Simulate Leak
                  </button>
                </div>

                <div className="h-40 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history[i] || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" hide />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="level" stroke="#2563eb" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="p-4 border rounded shadow bg-white">
          <h2 className="text-lg font-semibold mb-2">🗺️ Tank Locations</h2>
          <MapContainer center={[28.6139,77.209]} zoom={13} style={{height:"400px",width:"100%"}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            {tanks.map((tank, idx) => (
              <Marker
                key={idx}
                position={[tank.location.lat, tank.location.lng]}
                icon={tank.leakActive ? leakIcon : normalIcon}
              >
                <Popup>
                  <b>{tank.name}</b><br/>
                  Level: {tank.level}/{tank.capacity}<br/>
                  Plumbers: {tank.plumbers.length}
                </Popup>
              </Marker>
            ))}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </main>

      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default TankSimulator;
