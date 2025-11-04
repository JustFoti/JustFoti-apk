'use client';

/**
 * Drop-off Analysis Chart Component
 * Shows where users stop watching content
 */

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DropOffPoint {
  timestamp: number;
  percentage: number;
}

interface DropOffData {
  contentId: string;
  title: string;
  contentType: 'movie' | 'tv';
  dropOffPoints: DropOffPoint[];
}

interface DropOffChartProps {
  data: DropOffData[];
}

export default function DropOffChart({ data }: DropOffChartProps) {
  const [selectedContent, setSelectedContent] = useState<string>(
    data.length > 0 ? data[0].contentId : ''
  );

  if (data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        No drop-off data available
      </div>
    );
  }

  const selectedData = data.find(item => item.contentId === selectedContent);
  
  if (!selectedData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        No data for selected content
      </div>
    );
  }

  const chartData = selectedData.dropOffPoints
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(point => ({
      time: `${point.timestamp}%`,
      dropOff: parseFloat(point.percentage.toFixed(1)),
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
            At {data.time} of content
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            Drop-off: <strong>{data.dropOff}%</strong> of viewers
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          color: '#888',
        }}>
          Select Content
        </label>
        <select
          value={selectedContent}
          onChange={(e) => setSelectedContent(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {data.map(item => (
            <option key={item.contentId} value={item.contentId}>
              {item.title} ({item.contentType})
            </option>
          ))}
        </select>
      </div>

      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(239, 68, 68, 0.2)',
      }}>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
          Analyzing
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
          {selectedData.title}
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', textTransform: 'capitalize' }}>
          {selectedData.contentType}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="time"
            stroke="#888"
            style={{ fontSize: '12px' }}
            label={{ value: 'Content Progress', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            stroke="#888"
            style={{ fontSize: '12px' }}
            label={{ value: 'Drop-off Rate (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="dropOff"
            name="Drop-off Rate (%)"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
