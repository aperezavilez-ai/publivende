import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function EngagementChart() {
  const data = Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1}`,
    engagement: Math.floor(Math.random() * 3000) + 1000,
    reach: Math.floor(Math.random() * 10000) + 5000,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="engagement" stroke="#8b5cf6" strokeWidth={2} />
        <Line type="monotone" dataKey="reach" stroke="#06b6d4" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
