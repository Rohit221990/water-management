import React from "react";
import { Routes, Route } from "react-router-dom";
import WaterLeakDetection from "./Dashboard";
import StaffLogin from "./StaffLogin";
import PlumberLogin from "./PlumberLogin";
import StaffDashboard from "./StaffDashboard";
import PlumberDashboard from "./PlumberDashboard";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FacilityDashboard from "./SmartWaterDashboard";
import TankerDashboard from "./tankerForcast";
import LeakDetectionDashboard from "./leakDetection";
import ModernSensorManagement from "./SensorManagement";
import LocationHolder from "./LocationHolder";
const App = () => {
  console.log("App component rendered");
  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        <Route path="/" element={<FacilityDashboard />} />
        <Route path="/water-leak-detection" element={<WaterLeakDetection />} />
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/plumber-login" element={<PlumberLogin />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/plumber-dashboard" element={<PlumberDashboard />} />
        <Route path="/tanker-forecast" element={<TankerDashboard />} />
        <Route path="/leak-detection" element={<LeakDetectionDashboard />} />
        <Route path="/sensor-management" element={<ModernSensorManagement />} />
        <Route path ="/location-management" element={<LocationHolder />} />
        {/* Add other routes as needed */}
      </Routes>
    </div>
  );
};

export default App;
