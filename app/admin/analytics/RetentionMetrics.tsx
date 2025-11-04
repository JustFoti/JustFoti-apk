'use client';

/**
 * Retention Metrics Component
 * Displays user engagement and return patterns
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RetentionData {
  dailyActiveUsers: Array<{
    date: string;
    count: number;
  }>;
  avgSessionDuration: number;
  returnRate: number;
  churnRate: number;
}

interface RetentionMetricsProps {
  data: RetentionData;
}

export default function RetentionMetrics({ data }: RetentionMetricsProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = data.dailyActiveUsers.map(item => ({
    date: formatDate(item.date),
    users: item.count,
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
            {data.date}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            Active Users: <strong>{data.users}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Key Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '20px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
            Return Rate
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {data.returnRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Users who came back
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
            Churn Rate
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
            {data.churnRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Users who didn't return
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
            Avg Session Duration
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
            {formatDuration(data.avgSessionDuration)}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Time per session
          </div>
        </div>
      </div>

      {/* Daily Active Users Chart */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#fff',
        }}>
          Daily Active Users
        </h3>

        {chartData.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            No daily user data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="date"
                stroke="#888"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#888"
                style={{ fontSize: '12px' }}
                label={{ value: 'Active Users', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
