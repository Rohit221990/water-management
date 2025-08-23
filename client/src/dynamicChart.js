import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const initialData = [
  { name: 'April-25', lastYear: 1500, thisYear: 1350 },
  { name: 'June-25', lastYear: 900, thisYear: 800 },
  { name: 'July-25', lastYear: 1300, thisYear: 1200 },
  { name: 'August-25', lastYear: 1250, thisYear: 850 }
];

const newMonth = { name: 'September-25', lastYear: 1100, thisYear: 900 };

export default function DynamicBarChart() {
  const [data, setData] = useState(initialData);

  const addData = () => {
    setData(d => [...d, newMonth]);
  };

  return (
    <div>
      <button onClick={addData}>Add September Data</button>
      <BarChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="lastYear" fill="#888888" />
        <Bar dataKey="thisYear" fill="#3b83f6" />
      </BarChart>
    </div>
  );
}
