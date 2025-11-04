'use client';

/**
 * Peak Usage Hours Chart Component
 * Displays activity distribution across 24 hours
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PeakUsageData {
  hour: number;
  count: number;
  label: string;
}

interface PeakUsageChartProps {
  data: PeakUsageData[];
}

export default function PeakUsageChart({ data }: PeakUsageChartProps) {
  const chartData = [...data].sort((a, b) => a.hour - b.hour);

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
            {data.label}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            Activity: <strong>{data.count} events</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        No usage data available
      </div>
    );
  }

  // Find peak hour
  const peakHour = chartData.reduce((max, item) =>
    item.count > max.count ? item : max
  , chartData[0]);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
      }}>
        <div>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
            Peak Hour
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {peakHour.label}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
            Peak Activity
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {peakHour.count} events
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="label"
            stroke="#888"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#888"
            style={{ fontSize: '12px' }}
            label={{ value: 'Activity Count', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
