import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function NetworkComparison() {
  const data = [
    { red: 'Instagram', engagement: 6.2, reach: 45000, posts: 15 },
    { red: 'Facebook', engagement: 4.8, reach: 38000, posts: 12 },
    { red: 'Twitter', engagement: 3.5, reach: 22000, posts: 20 },
    { red: 'LinkedIn', engagement: 5.1, reach: 18000, posts: 8 },
    { red: 'TikTok', engagement: 7.3, reach: 52000, posts: 10 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="red" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="engagement" fill="#8b5cf6" name="Engagement %" />
      </BarChart>
    </ResponsiveContainer>
  );
}
