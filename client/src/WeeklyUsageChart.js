import React from "react";
import { Bar } from "react-chartjs-2";

export default function WeeklyUsageBarChart() {
  // Example data for last 7 days water usage in liters
  const data = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Water Usage (liters)",
        data: [450, 520, 480, 510, 530, 470, 500],
        backgroundColor: "#0fc98f",
        borderRadius: 5,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Liters" },
      },
      x: {
        title: { display: true, text: "Day of Week" },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div style={{ height: 300, width: "100%" }}>
      <Bar data={data} options={options} />
    </div>
  );
}
