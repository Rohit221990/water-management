import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Apr', amount: 1200 },
  { month: 'May', amount: 1500 },
  { month: 'Jun', amount: 1300 },
  { month: 'Jul', amount: 800 },
  { month: 'Aug', amount: 1000 },
];

const Earnings = () => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Earnings</h2>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="amount" fill="#4ade80" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default Earnings;
