'use client';

/**
 * Completion Rate Chart Component
 * Displays watch completion rates for content
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CompletionRateData {
  contentId: string;
  title: string;
  contentType: 'movie' | 'tv';
  completionRate: number;
  viewCount: number;
  avgWatchTime: number;
}

interface CompletionRateChartProps {
  data: CompletionRateData[];
}

export default function CompletionRateChart({ data }: CompletionRateChartProps) {
  // Sort by completion rate and take top 15
  const chartData = [...data]
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 15)
    .map(item => ({
      name: item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title,
      completionRate: parseFloat(item.completionRate.toFixed(1)),
      viewCount: item.viewCount,
      type: item.contentType,
    }));

  // Color based on completion rate
  const getColor = (rate: number) => {
    if (rate >= 80) return '#10b981'; // Green
    if (rate >= 60) return '#3b82f6'; // Blue
    if (rate >= 40) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

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
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{data.name}</p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            Completion Rate: <strong>{data.completionRate}%</strong>
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            Views: <strong>{data.viewCount}</strong>
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', textTransform: 'capitalize' }}>
            Type: <strong>{data.type}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
        No completion data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          stroke="#888"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#888"
          style={{ fontSize: '12px' }}
          label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey="completionRate"
          name="Completion Rate (%)"
          radius={[8, 8, 0, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.completionRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
