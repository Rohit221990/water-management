import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  CssBaseline,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const BUILDINGS = [
  { id: "B1", name: "Building A" },
  { id: "B2", name: "Building B" },
  { id: "B3", name: "Building C" },
  { id: "B4", name: "Building D" },
];

const SENSOR_TYPES = ["Leak Sensor", "Flow Sensor", "Water Level Sensor"];

export default function SensorManagement() {
  const [darkMode, setDarkMode] = useState(false);

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: "#1976d2",
      },
    },
  });

  const [formData, setFormData] = useState({
    sensorId: "",
    sensorType: SENSOR_TYPES[0],
    buildingId: BUILDINGS[0].id,
    installationDate: "",
  });

  const [sensors, setSensors] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddSensor = (e) => {
    e.preventDefault();
    if (!formData.sensorId || !formData.installationDate) {
      alert("Please fill all required fields");
      return;
    }
    setSensors((prev) => [formData, ...prev]);
    setFormData({
      sensorId: "",
      sensorType: SENSOR_TYPES[0],
      buildingId: BUILDINGS[0].id,
      installationDate: "",
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          maxWidth: 700,
          mx: "auto",
          mt: 8,
          mb: 8,
          px: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 3,
            alignItems: "center",
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold">
            Dynamic Sensor Management
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={() => setDarkMode((prev) => !prev)}
              />
            }
            label="Dark Mode"
          />
        </Box>

        <Paper sx={{ p: 4, mb: 5 }} elevation={3}>
          <Box
            component="form"
            onSubmit={handleAddSensor}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <TextField
              label="Sensor ID"
              name="sensorId"
              value={formData.sensorId}
              onChange={handleChange}
              autoFocus
              required
            />
            <TextField
              select
              label="Sensor Type"
              name="sensorType"
              value={formData.sensorType}
              onChange={handleChange}
            >
              {SENSOR_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Building"
              name="buildingId"
              value={formData.buildingId}
              onChange={handleChange}
            >
              {BUILDINGS.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Installation Date"
              type="date"
              name="installationDate"
              value={formData.installationDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ mt: 2, fontWeight: "bold" }}
            >
              Add Sensor
            </Button>
          </Box>
        </Paper>

        <Typography variant="h5" sx={{ mb: 3 }}>
          Registered Sensors ({sensors.length})
        </Typography>

        {sensors.length === 0 ? (
          <Typography>No sensors registered yet.</Typography>
        ) : (
          <List>
            {sensors.map(
              (
                { sensorId, sensorType, buildingId, installationDate },
                index
              ) => (
                <ListItem
                  key={sensorId + index}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    mb: 1,
                    boxShadow: 1,
                  }}
                >
                  <ListItemText
                    primary={`${sensorId} (${sensorType})`}
                    secondary={`${BUILDINGS.find(
                      (b) => b.id === buildingId
                    )?.name || buildingId} — Installed on ${new Date(
                      installationDate
                    ).toLocaleDateString()}`}
                  />
                </ListItem>
              )
            )}
          </List>
        )}
      </Box>
    </ThemeProvider>
  );
}
