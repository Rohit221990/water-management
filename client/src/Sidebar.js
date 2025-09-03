import React, { useState } from "react";
import FacilityDashboard from "./SmartWaterDashboard";
import "./index.css";
import { NavLink } from "react-router-dom";
import App from "./App";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M3 13h2v-2H3v2zm4 0h14v-2H7v2z" />
      </svg>
    ),
    path: "/",
  },
  {
    id: "projects",
    label: "WaterLeakDetection",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M4 19h16v-2H4v2zM4 7v6h16V7H4z" />
      </svg>
    ),
    path: "/water-leak-detection",
  },
  {
    id: "leakdetection",
    label: "Water Management",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 12c2.2 0 4-1.8 4-4S14.2 4 12 4 8 5.8 8 8s1.8 4 4 4zm-4 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z" />
      </svg>
    ),
    path: "/water-management",
  },
  {
    id: "sensormanagement",
    label: "Sensor Management",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M7 11H3v2h4v-2zm10-4h-8c-1.1 0-2 .9-2 2v6h12v-6c0-1.1-.9-2-2-2z" />
      </svg>
    ),
    path: "/sensor-management",
  },
  {
    id: "forcast",
    label: "Water Forecast",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 12c2.2 0 4-1.8 4-4S14.2 4 12 4 8 5.8 8 8s1.8 4 4 4zm-4 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z" />
      </svg>
    ),
    path: "/tanker-forecast",
  },
];

export default function AISidebar() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <style>{`
        :root {
          --sidebar-width: 260px;
          --sidebar-collapsed-width: 72px;
          --font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          --accent-color: #4f46e5;
          --text-dark: #1f2937;
          --text-muted: #6b7280;
          --sidebar-bg: #ffffff;
          --main-bg: #f9fafb;
          --hover-bg: #eef2ff;
          --active-bg: #dbeafe;
        }
        * {
          box-sizing: border-box;
        }
        body, #root {
          margin: 0; padding: 0; height: 100%;
          font-family: var(--font-family);
          background-color: var(--main-bg);
          color: var(--text-dark);
        }
        .container {
          display: flex;
          height: 100vh;
          width: 100vw;
        }
        .sidebar {
          background-color: var(--sidebar-bg);
          width: var(--sidebar-width);
          display: flex;
          flex-direction: column;
          padding: 2rem 1rem;
          border-right: 1px solid #e5e7eb;
          transition: width 0.3s ease;
          user-select: none;
        }
        .sidebar.collapsed {
          width: var(--sidebar-collapsed-width);
          padding: 2rem 0.5rem;
        }
        .logo {
          font-weight: 700;
          font-size: 1.5rem;
          margin-bottom: 2rem;
          color: var(--accent-color);
          text-align: center;
          cursor: default;
          user-select: text;
        }
        .logo.collapsed {
          font-size: 1.2rem;
        }
        nav a {
          display: flex;
          align-items: center;
          color: var(--text-dark);
          text-decoration: none;
          padding: 0.75rem 1rem;
          margin-bottom: 0.25rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }
        nav a svg {
          margin-right: 1rem;
          width: 20px;
          height: 20px;
          fill: var(--accent-color);
          flex-shrink: 0;
        }
        nav a:hover {
          background-color: var(--hover-bg);
          color: var(--accent-color);
        }
        nav a.active {
          background-color: var(--active-bg);
          color: var(--accent-color);
          font-weight: 600;
        }
        nav a.active svg {
          fill: var(--accent-color);
        }
        .sidebar.collapsed nav a span {
          display: none;
        }
        main {
          flex-grow: 1;
          padding: 2rem;
          overflow-y: auto;
        }
        .toggle-btn {
          margin-top: auto;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem 0;
          font-size: 1.5rem;
          color: var(--accent-color);
          user-select: none;
          transition: transform 0.3s ease;
          align-self: center;
        }
        .toggle-btn:hover {
          color: #4338ca;
        }
        .toggle-btn.collapsed {
          transform: rotate(180deg);
        }
        @media (max-width: 768px) {
          .sidebar {
            width: var(--sidebar-collapsed-width);
            padding: 2rem 0.5rem;
          }
          .sidebar.collapsed {
            width: var(--sidebar-collapsed-width);
          }
          nav a span {
            display: none;
          }
        }
      `}</style>

      <div className="container">
        <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
          <div
            className={`logo${collapsed ? " collapsed" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            <img
              src="/logo.png" // Replace with your logo path
              alt="Logo"
              style={{
                width: collapsed ? 32 : 40,
                height: collapsed ? 32 : 40,
                marginRight: collapsed ? 0 : 10,
                borderRadius: 8,
                transition: "all 0.3s ease",
              }}
            />
            {!collapsed && <span>Smart Water</span>}
          </div>
          <nav>
            {navItems.map(({ id, label, icon, path }) => (
              <NavLink
                key={id}
                to={path}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                end
              >
                {icon}
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>
          <button
            className={`toggle-btn${collapsed ? " collapsed" : ""}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            ➔
          </button>
        </aside>

        <main style={{ flexGrow: 1, padding: "2rem" }}>
          <App />
        </main>
      </div>
    </>
  );
}
