import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';

interface PieChartData {
  name: string;
  value: number;
}

interface SimpleChartProps {
  title: string;
  data: PieChartData[];
  colors?: string[];
  loading?: boolean;
}

const COLORS = ['#1976d2', '#dc004e', '#4caf50', '#ff9800', '#f44336'];

export const SimplePieChart: React.FC<SimpleChartProps> = ({
  title,
  data,
  colors = COLORS,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  return (
    <Card sx={{ height: 400 }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {data.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Typography color="textSecondary">No data available</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
