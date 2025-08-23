import React from 'react';
import ReactDOM from 'react-dom/client';
import SmartWaterDashboard from './SmartWaterDashboard';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><ToastContainer position="top-right" autoClose={3000} />;<SmartWaterDashboard /></React.StrictMode>);
