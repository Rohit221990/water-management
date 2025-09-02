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

// ---- Sensor Logic ----
const evaluateSensor = (sensor, tank) => {
  let status = "ok";
  if (sensor.type === "flow" && tank.level > 0 && Math.random() < 0.1) status = "leak";
  if (sensor.type === "pressure" && Math.random() < 0.05) status = "leak";
  if (sensor.type === "ultrasonic" && tank.level < tank.capacity / 2 && Math.random() < 0.08) status = "leak";
  return { ...sensor, status, lastCheck: new Date().toLocaleTimeString() };
};

const TankSimulator = () => {
  // ---- State ----
  const [tanks, setTanks] = useState(() => {
    const saved = localStorage.getItem("tanks");
    return saved
      ? JSON.parse(saved).map(t => ({ ...t, sensors: t.sensors || [], plumbers: t.plumbers || [] }))
      : [
          {
            name: "Building A",
            level: 10,
            capacity: 100,
            sensors: [{ id: 1, type: "flow", status: "ok" }],
            plumbers: [
              { name: "Ramesh", number: "+919876543210", type: "whatsapp" },
              { name: "Suresh", number: "+919812345678", type: "sms" },
            ],
            location: { lat: 28.6139, lng: 77.209 },
          },
          {
            name: "Building B",
            level: 10,
            capacity: 70,
            sensors: [],
            plumbers: [
              { name: "Mahesh", number: "+919999888777", type: "whatsapp" },
            ],
            location: { lat: 28.6205, lng: 77.225 },
          },
        ];
  });

  const [remotes, setRemotes] = useState(() => {
    const saved = localStorage.getItem("remotes");
    return saved ? JSON.parse(saved) : tanks.map(() => ({ active: false }));
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("history");
    return saved ? JSON.parse(saved) : tanks.map(() => []);
  });

  const [newTankName, setNewTankName] = useState("");
  const [newTankCapacity, setNewTankCapacity] = useState("");

  // ---- Persist ----
  useEffect(() => { localStorage.setItem("tanks", JSON.stringify(tanks)); }, [tanks]);
  useEffect(() => { localStorage.setItem("remotes", JSON.stringify(remotes)); }, [remotes]);
  useEffect(() => { localStorage.setItem("history", JSON.stringify(history)); }, [history]);

  // ---- Simulator: Fill & Sensors ----
  useEffect(() => {
    const interval = setInterval(() => {
      setTanks(prev =>
        prev.map((tank, i) => {
          let updatedTank = { ...tank };
          if (updatedTank.level < updatedTank.capacity && remotes[i]?.active) {
            updatedTank.level = Math.min(updatedTank.level + 10, updatedTank.capacity);
          }
          if (remotes[i]?.active && updatedTank.level >= updatedTank.capacity) {
            toast.success(`${updatedTank.name} is full!`);
          }

          // Evaluate sensors
          updatedTank.sensors = (tank.sensors || []).map(s => evaluateSensor(s, tank));

          // Leak detection
          if (updatedTank.sensors.some(s => s.status === "leak")) {
            toast.error(`🚨 Leak detected in ${updatedTank.name}!`);
            updatedTank.level = Math.max(updatedTank.level - 5, 0);

            // Auto notify plumbers
            if (updatedTank.plumbers?.length) {
              fetch("http://localhost:5000/send-leak-alert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tankName: updatedTank.name, plumbers: updatedTank.plumbers }),
              })
                .then(res => res.json())
                .then(data => {
                  if (data.success) data.results.forEach(r => toast.info(`📨 ${r.plumber} notified!`));
                })
                .catch(err => console.error(err));
            }
          }

          // Update history
          setHistory(prevHist => {
            const newHist = [...prevHist];
            const timestamp = new Date().toLocaleTimeString();
            if (!newHist[i]) newHist[i] = [];
            newHist[i] = [...newHist[i], { time: timestamp, level: updatedTank.level }].slice(-20);
            return newHist;
          });

          return updatedTank;
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [remotes]);

  // ---- Random Multi-Leak Simulation ----
  useEffect(() => {
    const leakInterval = setInterval(() => {
      setTanks(prev =>
        prev.map(tank => {
          const updatedTank = { ...tank };
          const leakHappens = Math.random() < 0.12;
          if (leakHappens && tank.sensors?.length > 0) {
            updatedTank.sensors = tank.sensors.map(s => ({ ...s, status: "leak" }));
            updatedTank.level = Math.max(updatedTank.level - 10, 0);

            if (tank.plumbers?.length) {
              fetch("http://localhost:5000/send-leak-alert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tankName: tank.name, plumbers: tank.plumbers }),
              })
                .then(res => res.json())
                .then(data => {
                  if (data.success) data.results.forEach(r => toast.info(`📨 ${r.plumber} notified!`));
                })
                .catch(err => console.error(err));
            }
            toast.error(`🚨 Random leak detected in ${tank.name}!`);
          }
          return updatedTank;
        })
      );
    }, 10000);
    return () => clearInterval(leakInterval);
  }, []);

  // ---- Controls ----
  const toggleRemote = i => setRemotes(remotes.map((r, idx) => idx === i ? { active: !r.active } : r));
  
  const addTank = () => {
    if (!newTankName || newTankCapacity <= 0) return toast.error("Enter valid name/capacity");
    setTanks([...tanks, { name: newTankName, level: 0, capacity: Number(newTankCapacity), sensors: [], plumbers: [], location: { lat: 28.61+Math.random()*0.05, lng: 77.20+Math.random()*0.05 } }]);
    setRemotes([...remotes, { active: false }]);
    setHistory([...history, []]);
    toast.success(`Added ${newTankName}`);
    setNewTankName(""); setNewTankCapacity("");
  };

  const addSensor = (tankIndex, type) => {
    setTanks(prev => prev.map((t,i)=>i===tankIndex?{...t,sensors:[...(t.sensors||[]),{id:Date.now(),type,status:"ok"}]}:t));
    toast.success(`Added ${type} sensor`);
  };

  const simulateLeak = tankIndex => {
    setTanks(prev => prev.map((tank,i)=>{
      if(i!==tankIndex) return tank;
      const updatedSensors = (tank.sensors||[]).map(s=>({...s,status:"leak"}));
      if(tank.plumbers?.length){
        fetch("http://localhost:5000/send-leak-alert",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({tankName:tank.name, plumbers:tank.plumbers})
        }).then(r=>r.json()).then(data=>{if(data.success)data.results.forEach(r=>toast.info(`📨 ${r.plumber} notified!`))}).catch(console.error);
      }
      toast.error(`🚨 Simulated leak in ${tank.name}!`);
      return {...tank,sensors:updatedSensors,level:Math.max(tank.level-10,0)};
    }));
  };

  const globalChartData = history[0]?history[0].map((p,idx)=>{
    const row = { time: p.time };
    history.forEach((h,tIdx)=>row[tanks[tIdx]?.name||`Tank${tIdx+1}`] = h[idx]?.level??null);
    return row;
  }):[];

  // ---- UI ----
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🏗️ Tank & Sensor Simulator</h1>

      {/* Global Chart */}
      <div className="p-4 border rounded shadow bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">🌍 Tank Levels</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={globalChartData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="time"/>
              <YAxis/>
              <Tooltip/>
              <Legend/>
              {tanks.map((t,i)=><Line key={t.name} dataKey={t.name} stroke={["#2563eb","#dc2626","#16a34a","#9333ea","#f59e0b"][i%5]} dot={false}/>)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tanks */}
      <div className="grid grid-cols-2 gap-6">
        {tanks.map((tank,i)=>(
          <div key={i} className="p-4 border rounded shadow">
            <h2 className="text-xl font-semibold">{tank.name}</h2>
            <p>💧 Level: {tank.level}/{tank.capacity}</p>
            <button className={`mt-2 px-3 py-1 rounded ${remotes[i]?.active?"bg-red-500":"bg-green-500"} text-white`} onClick={()=>toggleRemote(i)}>
              {remotes[i]?.active?"Turn Off Remote":"Turn On Remote"}
            </button>

            {/* Sensors */}
            <h3 className="mt-4 font-medium">Sensors:</h3>
            {(tank.sensors||[]).length===0?<p>No sensors</p>:<ul className="list-disc ml-6">{tank.sensors.map(s=><li key={s.id}>{s.type} - <span className={s.status==="ok"?"text-green-600":s.status==="leak"?"text-red-600 font-bold":"text-gray-600"}>{s.status}</span></li>)}</ul>}
            <div className="flex gap-2 mt-2">
              <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={()=>addSensor(i,"flow")}>+ Flow</button>
              <button className="bg-purple-500 text-white px-2 py-1 rounded" onClick={()=>addSensor(i,"pressure")}>+ Pressure</button>
              <button className="bg-orange-500 text-white px-2 py-1 rounded" onClick={()=>addSensor(i,"ultrasonic")}>+ Ultrasonic</button>
            </div>

            {/* Hardcoded Plumbers */}
            <div className="mt-2">
              <h4 className="font-medium">Plumbers:</h4>
              <ul>{(tank.plumbers||[]).map((p,idx)=><li key={idx}>{p.name} ({p.type}) - {p.number}</li>)}</ul>
            </div>

            {/* Simulate Leak */}
            <button className="bg-red-600 text-white px-2 py-1 mt-2 rounded" onClick={()=>simulateLeak(i)}>💥 Simulate Leak</button>

            {/* Tank Chart */}
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history[i]||[]}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="time"/>
                  <YAxis/>
                  <Tooltip/>
                  <Legend/>
                  <Line type="monotone" dataKey="level" stroke="#2563eb"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Add Tank */}
      <div className="mt-6 p-4 border rounded">
        <h2 className="text-lg font-semibold">➕ Add New Tank</h2>
        <input type="text" placeholder="Tank name" value={newTankName} onChange={e=>setNewTankName(e.target.value)} className="border p-2 mr-2"/>
        <input type="number" placeholder="Capacity" value={newTankCapacity} onChange={e=>setNewTankCapacity(e.target.value)} className="border p-2 mr-2"/>
        <button onClick={addTank} className="bg-green-600 text-white px-3 py-1 rounded">Add Tank</button>
      </div>

      {/* Map */}
      <div className="p-4 border rounded shadow bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">🗺️ Tank Locations</h2>
        <MapContainer center={[28.6139,77.209]} zoom={13} style={{height:"400px",width:"100%"}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {tanks.map((tank,idx)=>(
            <Marker key={idx} position={[tank.location.lat,tank.location.lng]} icon={tank.sensors?.some(s=>s.status==="leak")?leakIcon:normalIcon}>
              <Popup>
                <b>{tank.name}</b><br/>
                Level: {tank.level}/{tank.capacity}<br/>
                Sensors: {(tank.sensors||[]).length}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <ToastContainer position="bottom-right"/>
    </div>
  );
};

export default TankSimulator;
