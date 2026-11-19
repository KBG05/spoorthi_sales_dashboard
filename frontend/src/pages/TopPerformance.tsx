import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { useTheme } from '@mui/material/styles';
import { topPerformanceApi } from '../api';
import type {
  TopPerformerItem,
  TopPerformersResponse,
  TopPerformerEntity,
  TopPerformerMetric,
} from '../api/types';
import { TOP_PERFORMER_PALETTE } from '../constants/constants';

const ENTITY_LABELS: Record<TopPerformerEntity, string> = {
  Customers: 'Customers',
  Products: 'Products',
  Categories: 'Product Categories',
};

const formatCr = (rupees: number) => `₹${(rupees / 10_000_000).toFixed(2)} Cr`;
const formatQty = (qty: number) => qty.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const formatTick = (value: number, metric: TopPerformerMetric) => {
  if (metric === 'Value') {
    if (value >= 100) return `₹${value.toFixed(0)}Cr`;
    if (value >= 10) return `₹${value.toFixed(1)}Cr`;
    return `₹${value.toFixed(2)}Cr`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toFixed(0);
};

interface TopChartProps {
  title: string;
  items: TopPerformerItem[];
  metric: TopPerformerMetric;
  entityType: TopPerformerEntity;
}

const TopChart: React.FC<TopChartProps> = ({ title, items, metric, entityType }) => {
  const theme = useTheme();

  const labels = items.map(item => {
    const name = item.name || item.id;
    // Products show "code – description" so both are visible on the axis
    return entityType === 'Products' && name !== item.id ? `${item.id} – ${name}` : name;
  });
  // Value is plotted in crores, Quantity in units
  const values = items.map(item => (metric === 'Value' ? item.revenue / 10_000_000 : item.quantity));

  // Tooltip/label show the other metric too, so volume vs revenue drivers can be compared
  const describe = (index: number) => {
    const item = items[index];
    if (!item) return '';
    return metric === 'Value'
      ? `${formatCr(item.revenue)} · Qty ${formatQty(item.quantity)}`
      : `Qty ${formatQty(item.quantity)} · ${formatCr(item.revenue)}`;
  };

  return (
    <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      ) : (
        <Box flex={1} minHeight={400}>
          <BarChart
            layout="horizontal"
            yAxis={[{
              scaleType: 'band',
              data: labels,
              tickLabelStyle: { fontSize: 12, fontWeight: 600 },
              valueFormatter: (value: string, context: AxisValueFormatterContext) =>
                context.location === 'tick' && value.length > 42 ? `${value.slice(0, 40)}…` : value,
              colorMap: {
                type: 'ordinal',
                colors: TOP_PERFORMER_PALETTE.map(([light, dark]) => theme.palette.mode === 'dark' ? dark : light),
              },
              width: 300,
            }]}
            xAxis={[{
              height: 44,
              tickLabelStyle: { fontSize: 12, fontWeight: 600, fill: theme.palette.text.secondary },
              valueFormatter: (value: number, context: AxisValueFormatterContext) =>
                context.location === 'tick'
                  ? formatTick(value, metric)
                  : metric === 'Value' ? `₹${value.toFixed(2)} Cr` : formatQty(value),
              min: 0,
            }]}
            margin={{ top: 20, right: 80, bottom: 50, left: 220 }}
            series={[{
              data: values,
              label: metric === 'Value' ? 'Revenue (Cr)' : 'Quantity',
              valueFormatter: (_value, { dataIndex }) => describe(dataIndex),
            }]}
            grid={{ vertical: true, horizontal: false }}
            barLabel={(item) =>
              metric === 'Value' ? `₹${item.value?.toFixed(2)} Cr` : formatQty(item.value ?? 0)
            }
            slotProps={{
              barLabel: {
                style: {
                  fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                  fontWeight: 700,
                  fontSize: 12,
                },
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

const TopPerformance: React.FC = () => {
  const [financialYear, setFinancialYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [entityType, setEntityType] = useState<TopPerformerEntity>('Customers');
  const [metric, setMetric] = useState<TopPerformerMetric>('Value');
  const [data, setData] = useState<TopPerformersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await topPerformanceApi.getAvailableYears(entityType);
        const years = response.data.financial_years;
        setAvailableYears(years);
        if (years.length > 0 && !years.includes(financialYear)) {
          setFinancialYear(years[0]);
        } else if (years.length === 0) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching top performance years:', error);
        setAvailableYears([]);
        setLoading(false);
      }
    };
    fetchAvailableYears();
  }, [entityType]);

  useEffect(() => {
    if (!financialYear) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await topPerformanceApi.getTopPerformers(entityType, financialYear, metric);
        setData(result);
      } catch (error) {
        console.error('Error fetching top performance:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, entityType, metric]);

  const entityLabel = ENTITY_LABELS[entityType];
  const metricLabel = metric === 'Value' ? 'by Value' : 'by Quantity';

  const fyItems = useMemo(() => data?.top_fy ?? [], [data]);
  const latestItems = useMemo(() => data?.top_latest ?? [], [data]);

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Top Performers
      </Typography>

      {/* Filter Section */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Financial Year</InputLabel>
          <Select
            value={financialYear}
            label="Financial Year"
            onChange={(e) => setFinancialYear(e.target.value)}
            disabled={availableYears.length === 0}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={entityType}
          exclusive
          onChange={(_, value) => value && setEntityType(value)}
          size="small"
        >
          <ToggleButton value="Customers">Customers</ToggleButton>
          <ToggleButton value="Products">Products</ToggleButton>
          <ToggleButton value="Categories">Product Category</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={metric}
          exclusive
          onChange={(_, value) => value && setMetric(value)}
          size="small"
        >
          <ToggleButton value="Value">Value</ToggleButton>
          <ToggleButton value="Quantity">Quantity</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="flex" gap={2} flex={1} minHeight={0} flexDirection="column">
          <TopChart
            title={`Top 10 ${entityLabel} ${metricLabel} - ${financialYear}`}
            items={fyItems}
            metric={metric}
            entityType={entityType}
          />
          <TopChart
            title={`Top 10 ${entityLabel} ${metricLabel} - Latest Month`}
            items={latestItems}
            metric={metric}
            entityType={entityType}
          />
        </Box>
      )}
    </Box>
  );
};

export default TopPerformance;
