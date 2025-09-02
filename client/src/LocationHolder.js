import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Paper,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "leaflet/dist/leaflet.css";

const leakIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/565/565547.png",
  iconSize: [25, 25],
  iconAnchor: [12, 24],
});

const highlightedLeakIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/565/565547.png",
  iconSize: [40, 40], // Larger
  iconAnchor: [20, 38],
  className: "highlighted-marker",
});

const flowIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3524/3524631.png",
  iconSize: [25, 25],
  iconAnchor: [12, 24],
});

const highlightedFlowIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3524/3524631.png",
  iconSize: [40, 40],
  iconAnchor: [20, 38],
  className: "highlighted-marker",
});

const BUILDINGS = [
  {
    id: "B1",
    name: "Building A",
    sensors: [
      {
        id: "S1",
        type: "leak",
        lat: 28.6139,
        lng: 77.2095,
        waterUsage: 25,
        leakDetected: false,
      },
      {
        id: "S2",
        type: "flow",
        lat: 28.6142,
        lng: 77.2085,
        waterUsage: 40,
        leakDetected: true,
      },
    ],
  },
  {
    id: "B2",
    name: "Building B",
    sensors: [
      {
        id: "S3",
        type: "flow",
        lat: 28.6153,
        lng: 77.2075,
        waterUsage: 20,
        leakDetected: false,
      },
    ],
  },
  {
    id: "B3",
    name: "Building C",
    sensors: [
      {
        id: "S4",
        type: "leak",
        lat: 28.6105,
        lng: 77.2057,
        waterUsage: 15,
        leakDetected: true,
      },
      {
        id: "S5",
        type: "leak",
        lat: 28.6112,
        lng: 77.2045,
        waterUsage: 10,
        leakDetected: false,
      },
    ],
  },
  {
    id: "B4",
    name: "Building D",
    sensors: [
      {
        id: "S6",
        type: "flow",
        lat: 28.6171,
        lng: 77.2028,
        waterUsage: 35,
        leakDetected: false,
      },
    ],
  },
];

const ALL_SENSORS = BUILDINGS.flatMap((b) =>
  b.sensors.map((s) => ({ ...s, building: b.name }))
);

function MapFlyTo({ location }) {
  const map = useMap();
  React.useEffect(() => {
    if (location) {
      map.flyTo(location, 17, { duration: 1.2 });
    }
  }, [location, map]);
  return null;
}

export default function LeakDashboardFullExample() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [flyToLatLng, setFlyToLatLng] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(
    ALL_SENSORS.some((s) => s.leakDetected)
  );

  // Filter active leaks
  const activeAlerts = ALL_SENSORS.filter((s) => s.leakDetected);

  // Handler for "Show on Map"
  const handleShowOnMap = (sensor) => {
    setFlyToLatLng([sensor.lat, sensor.lng]);
    setHighlightedId(sensor.id);
    setDrawerOpen(false);

    setSnackbarOpen(true); // Snackbar on focus
  };

  // Close snackbar handler
  function handleSnackbarClose() {
    setSnackbarOpen(false);
  }

  // Chart data
  const chartData = ALL_SENSORS.map((s) => ({
    sensorId: `${s.building} - ${s.id}`,
    waterUsage: s.waterUsage,
    leak: s.leakDetected ? 1 : 0,
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Sensor Leak Alerts & Visualization Dashboard
      </Typography>

      {activeAlerts.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 2, cursor: "pointer" }}
          onClick={() => setDrawerOpen(true)}
        >
          {activeAlerts.length} Active Leak Alert(s) &mdash; Click to view and
          focus on the map.
        </Alert>
      )}

      <Box sx={{ height: 400, mb: 4 }}>
        <MapContainer
          center={[28.6139, 77.209]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {ALL_SENSORS.map((sensor) => (
            <Marker
              key={sensor.id}
              position={[sensor.lat, sensor.lng]}
              icon={
                sensor.id === highlightedId
                  ? sensor.type === "leak"
                    ? highlightedLeakIcon
                    : highlightedFlowIcon
                  : sensor.type === "leak"
                  ? leakIcon
                  : flowIcon
              }
              eventHandlers={{
                click: () => setHighlightedId(sensor.id),
              }}
            >
              <Popup>
                <Typography fontWeight="bold">{sensor.id}</Typography>
                <Typography>{sensor.building}</Typography>
                <Typography>Type: {sensor.type}</Typography>
                <Typography>
                  Leak Detected: {sensor.leakDetected ? "Yes" : "No"}
                </Typography>
                <Typography>Water Usage: {sensor.waterUsage} L/min</Typography>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ mt: 1 }}
                  onClick={() => handleShowOnMap(sensor)}
                >
                  Highlight & Focus
                </Button>
              </Popup>
            </Marker>
          ))}
          {flyToLatLng && <MapFlyTo location={flyToLatLng} />}
        </MapContainer>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Sensor Water Usage Chart
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="sensorId" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="waterUsage"
              fill="#1976d2"
              name="Water Usage (L/min)"
            />
            <Bar dataKey="leak" fill="#d32f2f" name="Leak Detected" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 350, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Active Leak Alerts
          </Typography>
          <List>
            {activeAlerts.length === 0 && (
              <Typography>No active alerts.</Typography>
            )}
            material";
            {activeAlerts.map((sensor) => (
              <ListItem
                key={sensor.id}
                disableGutters
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                  py: 1.5, // Slight vertical padding for clarity
                }}
              >
                <Box sx={{ flexGrow: 1, pr: 2 }}>
                  <ListItemText
                    primary={`${sensor.building} • ${sensor.id}`}
                    secondary={`Type: ${
                      sensor.type
                    } | Lat: ${sensor.lat.toFixed(
                      4
                    )} / Lng: ${sensor.lng.toFixed(4)}`}
                    primaryTypographyProps={{ fontWeight: "bold" }}
                  />
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ whiteSpace: "nowrap", minWidth: 120 }}
                  onClick={() => handleShowOnMap(sensor)}
                >
                  Location
                </Button>
              </ListItem>
            ))}
          </List>
          <Button
            onClick={() => setDrawerOpen(false)}
            fullWidth
            sx={{ mt: 2 }}
            variant="outlined"
          >
            Close
          </Button>
        </Box>
      </Drawer>

      {/* Auto-closing Snackbar Alert */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3200}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message="Sensor highlighted and centered!"
      />
    </Box>
  );
}
