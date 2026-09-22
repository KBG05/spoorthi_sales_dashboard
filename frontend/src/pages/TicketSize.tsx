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
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { BarChart } from '@mui/x-charts/BarChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { useTheme } from '@mui/material/styles';
import { ticketSizeApi } from '../api';
import type { TicketSizeBand, TicketSizeBandDetail } from '../api/types';
import { DASHBOARD_CHART_COLORS } from '../constants/constants';

const formatRupees = (value: number) => {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} CR`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
};

const TicketSize: React.FC = () => {
  const theme = useTheme();
  const [financialYear, setFinancialYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [dimension, setDimension] = useState<'Products' | 'Customers'>('Customers');
  const [data, setData] = useState<TicketSizeBand[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBand, setSelectedBand] = useState<string | null>(null);
  const [bandDetails, setBandDetails] = useState<TicketSizeBandDetail[]>([]);
  const [bandDetailsLoading, setBandDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await ticketSizeApi.getAvailableYears();
        const years = response.data.financial_years;
        setAvailableYears(years);
        if (years.length > 0 && !financialYear) {
          setFinancialYear(years[0]);
        } else if (years.length === 0) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching ticket size years:', error);
        setAvailableYears([]);
        setLoading(false);
      }
    };
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (!financialYear) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await ticketSizeApi.getBands(financialYear, dimension);
        setData(result);
      } catch (error) {
        console.error('Error fetching ticket size:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, dimension]);

  const countData = useMemo(() => {
    const filtered = data.filter(item => item.metric === 'Count');
    return {
      bands: filtered.map(item => item.band),
      values: filtered.map(item => item.value),
      labels: filtered.map(item => item.plot_label),
    };
  }, [data]);

  const revenueData = useMemo(() => {
    const filtered = data.filter(item => item.metric === 'Revenue');
    return {
      bands: filtered.map(item => item.band),
      values: filtered.map(item => item.value / 1e7), // Convert to Crores
      labels: filtered.map(item => item.plot_label),
    };
  }, [data]);

  const handleBandClick = async (band: string) => {
    setSelectedBand(band);
    setBandDetailsLoading(true);
    try {
      const result = await ticketSizeApi.getBandDetails(financialYear, dimension, band);
      setBandDetails(result);
    } catch (error) {
      console.error('Error fetching ticket size band details:', error);
      setBandDetails([]);
    } finally {
      setBandDetailsLoading(false);
    }
  };

  const closeBandDetails = () => {
    setSelectedBand(null);
    setBandDetails([]);
  };

  const relatedColumnLabel = dimension === 'Products' ? 'Customers' : 'Products';

  // Approximate total revenue in Crores

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Revenue Ticket Size Analysis
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
          alignItems: 'center'
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
          value={dimension}
          exclusive
          onChange={(_, value) => value && setDimension(value)}
          size="small"
        >
          <ToggleButton value="Customers">Customers</ToggleButton>
          <ToggleButton value="Products">Products</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Charts Section */}
      <Box display="flex" gap={2} flex={1} minHeight={0}>
        {/* Count Chart */}
        <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="h6" gutterBottom>
            Number of {dimension}
          </Typography>
          <Box flex={1} minHeight={0} sx={{ cursor: 'pointer' }}>
            <BarChart
              onAxisClick={(_event, data) => {
                if (!data) return;
                const band = countData.bands[data.dataIndex];
                if (band) handleBandClick(band);
              }}
              xAxis={[{ scaleType: 'band', data: countData.bands, height: 44, colorMap: { type: 'ordinal', colors: DASHBOARD_CHART_COLORS.slice() } }]}
              yAxis={[{
                width: 70,
                min: 0,
                tickMinStep: (() => {
                  if (countData.values.length === 0) return 1;
                  const maxVal = Math.max(...countData.values);
                  const range = maxVal;
                  if (range < 10) return 1;
                  if (range < 50) return 5;
                  if (range < 100) return 10;
                  if (range < 500) return 50;
                  return Math.ceil(range / 5 / 100) * 100;
                })(),
              }]}
              series={[
                {
                  data: countData.values,
                  label: 'Count',
                  valueFormatter: (value, { dataIndex }) => 
                    countData.labels[dataIndex] || value?.toString() || '0',
                },
              ]}
              margin={{ top: 36, right: 30, bottom: 50, left: 80 }}
              grid={{ vertical: false, horizontal: true }}
              barLabel="value"
              slotProps={{
                barLabel: {
                  placement: 'outside',
                  style: {
                    fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    fontWeight: 700,
                    fontSize: 15,
                    transform: 'translateY(-8px)',
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Revenue Chart */}
        <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="h6" gutterBottom>
            Total Revenue
          </Typography>
          
          <Box flex={1} minHeight={0} sx={{ cursor: 'pointer' }}>
            <BarChart
              onAxisClick={(_event, data) => {
                if (!data) return;
                const band = revenueData.bands[data.dataIndex];
                if (band) handleBandClick(band);
              }}
              xAxis={[{ scaleType: 'band', data: revenueData.bands, height: 44, colorMap: { type: 'ordinal', colors: DASHBOARD_CHART_COLORS.slice() } }]}
              yAxis={[{
                width: 70,
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    // Short format for tick labels
                    return `₹${value.toFixed(1)}Cr`;
                  }
                  // Full format for tooltips
                  return `₹${value.toFixed(2)}Cr`;
                },
                min: 0,
                tickMinStep: (() => {
                  if (revenueData.values.length === 0) return 1;
                  const maxVal = Math.max(...revenueData.values);
                  const range = maxVal;
                  if (range < 10) return 1;
                  if (range < 50) return 5;
                  if (range < 100) return 10;
                  if (range < 500) return 50;
                  return Math.ceil(range / 5 / 100) * 100;
                })(),
              }]}
              series={[
                {
                  data: revenueData.values,
                  label: 'Revenue (CR)',
                  valueFormatter: (value, { dataIndex }) => 
                    revenueData.labels[dataIndex] || `₹${value?.toFixed(2)}Cr`,
                },
              ]}
              margin={{ top: 36, right: 30, bottom: 50, left: 100 }}
              barLabel={(item) => `₹${item.value?.toFixed(1)}Cr`}
              slotProps={{
                barLabel: {
                  placement: 'outside',
                  
                  style: {
                    fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    fontWeight: 600,
                    fontSize: 14,
                    transform: 'translateY(-8px)',
                  },
                },
              }}
              grid={{ vertical: false, horizontal: true }}
              
              // slotProps={{
              //   barLabel: {
              //     style: {
              //       fill: '#ffffff',
              //       fontSize: 11,
              //       fontWeight: 600,
              //     },

              //   },

              // }}
            />
          </Box>
        </Box>
      </Box>

      <Dialog open={selectedBand !== null} onClose={closeBandDetails} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            {dimension} in band {selectedBand}
            <Typography variant="body2" color="text.secondary">
              {financialYear}
            </Typography>
          </Box>
          <IconButton onClick={closeBandDetails} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {bandDetailsLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : bandDetails.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No {dimension.toLowerCase()} found in this band.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{dimension === 'Products' ? 'Product' : 'Customer'}</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Invoices</TableCell>
                    <TableCell align="right">{relatedColumnLabel}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bandDetails.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.name}</TableCell>
                      <TableCell align="right">{formatRupees(row.revenue)}</TableCell>
                      <TableCell align="right">{row.invoice_count.toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">{row.related_count.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TicketSize;
