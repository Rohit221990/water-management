import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App"; // Your main App component with Routes
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from './Sidebar'

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
      <Sidebar />
  </BrowserRouter>
);
