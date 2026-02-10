import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Paper, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { ShoppingCart } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { useTheme } from '@mui/material/styles';
import { dashboardApi } from '../api';
import type { KPIResponse, CategoryBreakupItem, ABCXYZMatrixCell } from '../api/types';
import { ABC_COLORS, XYZ_COLORS, ABC_XYZ_COLORS } from '../constants/constants';

// Custom Rupee Icon Component
const RupeeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M13.66 7C13.1 5.82 11.9 5 10.5 5H6V3h12v2h-3.26c.48.58.84 1.26 1.05 2H18v2h-2.02c-.25 2.8-2.61 5-5.48 5h-.73l6.73 7h-2.77L7 14v-2h3.5c1.76 0 3.22-1.3 3.46-3H6V7h7.66Z"/>
  </svg>
);

interface CategoryData {
  category: string;
  count?: number;
  revenue?: number;
}

const Dashboard = () => {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(12);
  const [availableMonths] = useState<Array<{id: number, name: string}>>([
    { id: 4, name: 'April 2025' },
    { id: 5, name: 'May 2025' },
    { id: 6, name: 'June 2025' },
    { id: 7, name: 'July 2025' },
    { id: 8, name: 'August 2025' },
    { id: 9, name: 'September 2025' },
    { id: 10, name: 'October 2025' },
    { id: 11, name: 'November 2025' },
    { id: 12, name: 'December 2025' },
    { id: 1, name: 'January 2026' },
    { id: 2, name: 'February 2026' },
    { id: 3, name: 'March 2026' },
  ]);
  const [kpiData, setKpiData] = useState<KPIResponse | null>(null);
  const [categoryBreakup, setCategoryBreakup] = useState<CategoryBreakupItem[]>([]);
  const [abcXyzMatrix, setAbcXyzMatrix] = useState<ABCXYZMatrixCell[]>([]);
  const [abcCount, setAbcCount] = useState<CategoryData[]>([]);
  const [abcRevenue, setAbcRevenue] = useState<CategoryData[]>([]);
  const [xyzCount, setXyzCount] = useState<CategoryData[]>([]);
  const [xyzRevenue, setXyzRevenue] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Convert month selection to TimeID
      // TimeID calculation: (year - 2021) * 12 + month
      // April 2025 (id=4) -> TimeID = (2025-2021)*12 + 4 = 52
      // December 2025 (id=12) -> TimeID = (2025-2021)*12 + 12 = 60
      // January 2026 (id=1) -> TimeID = (2026-2021)*12 + 1 = 61
      // March 2026 (id=3) -> TimeID = (2026-2021)*12 + 3 = 63
      let timeId: number | undefined = undefined;
      if (selectedMonth !== '') {
        if (selectedMonth >= 4 && selectedMonth <= 12) {
          // April to December 2025
          timeId = (2025 - 2021) * 12 + selectedMonth;
        } else if (selectedMonth >= 1 && selectedMonth <= 3) {
          // January to March 2026
          timeId = (2026 - 2021) * 12 + selectedMonth;
        }
      }
      
      // Fetch each dataset independently to prevent one failure from stopping others
      const fetchKPIs = dashboardApi.getKPIs(timeId)
        .then(res => setKpiData(res.data))
        .catch(err => console.error('Error fetching KPIs:', err));
      
      const fetchCategoryBreakup = dashboardApi.getCategoryBreakup(timeId)
        .then(res => setCategoryBreakup(res.data))
        .catch(err => console.error('Error fetching category breakup:', err));
      
      const fetchABCXYZMatrix = dashboardApi.getABCXYZMatrix()
        .then(res => setAbcXyzMatrix(res.data))
        .catch(err => console.error('Error fetching ABC×XYZ matrix:', err));
      
      const fetchABCCount = dashboardApi.getABCCount()
        .then(res => setAbcCount(res.data))
        .catch(err => console.error('Error fetching ABC count:', err));
      
      const fetchABCRevenue = dashboardApi.getABCRevenue()
        .then(res => setAbcRevenue(res.data))
        .catch(err => console.error('Error fetching ABC revenue:', err));
      
      const fetchXYZCount = dashboardApi.getXYZCount()
        .then(res => setXyzCount(res.data))
        .catch(err => console.error('Error fetching XYZ count:', err));
      
      const fetchXYZRevenue = dashboardApi.getXYZRevenue()
        .then(res => setXyzRevenue(res.data))
        .catch(err => console.error('Error fetching XYZ revenue:', err));
      
      // Wait for all to complete (success or failure)
      await Promise.allSettled([
        fetchKPIs,
        fetchCategoryBreakup,
        fetchABCXYZMatrix,
        fetchABCCount,
        fetchABCRevenue,
        fetchXYZCount,
        fetchXYZRevenue,
      ]);
      
      setLoading(false);
    };

    fetchData();
  }, [selectedMonth]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const kpis = [
    { 
      title: 'Total Revenue', 
      value: kpiData ? formatCurrency(kpiData.total_revenue) : '₹0', 
      subtitle: kpiData?.month_name || 'N/A',
      icon: <RupeeIcon />,
      color: ABC_COLORS.B, // Green
    },
    { 
      title: 'Total Quantity', 
      value: kpiData ? formatNumber(kpiData.total_quantity) : '0',
      subtitle: kpiData?.month_name || 'N/A',
      icon: <ShoppingCart />,
      color: ABC_COLORS.B, // Green
    },
  ];

  return (
    <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Monthly Performance Dashboard
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Month Filter</InputLabel>
          <Select
            value={selectedMonth}
            label="Month Filter"
            onChange={(e) => setSelectedMonth(e.target.value as number | '')}
          >
            <MenuItem value="">All Months</MenuItem>
            {availableMonths.map((month) => (
              <MenuItem key={month.id} value={month.id}>
                {month.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards Row */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        {kpis.map((kpi, index) => (
          <Box
            key={index}
            sx={{
              flexBasis: {
                xs: '100%',
                sm: 'calc(50% - 8px)',
              },
              flexGrow: 0,
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            <Card 
              elevation={0} 
              sx={{ 
                height: '100%',
                minHeight: 130,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* Top Row: Value (left) and Icon (right) */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1, mb: 0.5 }}>
                      {kpi.value}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ fontWeight: 500, fontSize: '0.9rem' }}
                    >
                      {kpi.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      bgcolor: kpi.color + '15',
                      color: kpi.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${kpi.color}30`,
                      flexShrink: 0,
                    }}
                  >
                    {kpi.icon}
                  </Box>
                </Box>

                {/* Subtitle (month name) with subtle background */}
                <Box 
                  sx={{ 
                    px: 1.5, 
                    py: 0.5, 
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    display: 'inline-block',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {kpi.subtitle}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Pie Chart and ABC×XYZ Matrices Row */}
      <Box sx={{ mb: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Pie Chart */}
        <Box sx={{ flex: '1 1 calc(33.333% - 11px)', minWidth: 300 }}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Category Breakup
            </Typography>
              {categoryBreakup.length > 0 ? (
                <PieChart
                  series={[
                    {
                      data: Object.entries(
                        categoryBreakup.reduce((acc, cat) => {
                          const category = cat.category || 'MISC';
                          acc[category] = (acc[category] || 0) + (cat.revenue / 10000000);
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([category, value], index) => ({
                        id: index,
                        value: value,
                        label: category,
                      })),
                      highlightScope: { fade: 'global', highlight: 'item' },
                      valueFormatter: (item) => `₹${item.value.toFixed(2)} Cr`,
                    },
                  ]}
                  height={340}
                  slotProps={{
                    legend: {
                      position: { vertical: 'bottom', horizontal: 'center' },
                      padding: 0,
                    } as any,
                  }}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                  <Typography color="text.secondary">No data</Typography>
                </Box>
              )}
            </Paper>
          </Box>
          
          {/* ABC×XYZ Revenue Matrix */}
          <Box sx={{ flex: '1 1 calc(33.333% - 11px)', minWidth: 300 }}>
            <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.95rem' }}>
                ABC×XYZ Revenue Matrix
              </Typography>
              {abcXyzMatrix.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: '50px repeat(3, 1fr)', gap: 2, mt: 0.5 }}>
                  <Box></Box>
                  <Box sx={{ fontWeight: 600, textAlign: 'center', fontSize: '1rem', p: 0.5 }}>X</Box>
                  <Box sx={{ fontWeight: 600, textAlign: 'center', fontSize: '1rem', p: 0.5 }}>Y</Box>
                  <Box sx={{ fontWeight: 600, textAlign: 'center', fontSize: '1rem', p: 0.5 }}>Z</Box>
                  
                  {['A', 'B', 'C'].map((abc) => (
                    <>
                      <Box key={`label-${abc}`} sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', fontSize: '1rem', p: 0.5 }}>
                        {abc}
                      </Box>
                      {['X', 'Y', 'Z'].map((xyz) => {
                        const cell = abcXyzMatrix.find(
                          (c) => c.abc === abc && c.xyz === xyz
                        );
                        const bgColor = ABC_XYZ_COLORS[`${abc}${xyz}`] || '#ccc';
                        
                        return (
                          <Card
                            key={`${abc}${xyz}`}
                            elevation={1}
                            sx={{
                              bgcolor: `${bgColor}30`,
                              minHeight: 80,
                              maxHeight: 80,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              p: 1,
                              border: `1px solid ${bgColor}`,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              ₹{cell ? (cell.revenue / 10000000).toFixed(1) : '0.0'}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.75rem' }} color="text.secondary">
                              Cr
                            </Typography>
                          </Card>
                        );
                      })}
                    </>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                  <Typography color="text.secondary">No data</Typography>
                </Box>
              )}
            </Paper>
          </Box>
          
          {/* ABC×XYZ Quantity Matrix */}
          <Box sx={{ flex: '1 1 calc(33.333% - 11px)', minWidth: 300 }}>
            <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.95rem' }}>
                ABC×XYZ Quantity Matrix
              </Typography>
              {abcXyzMatrix.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: '50px repeat(3, 1fr)', gap: 2, mt: 0.5 }}>
                  <Box></Box>
                  <Box sx={{ fontWeight: 600, textAlign: 'center', fontSize: '1rem', p: 0.5 }}>X</Box>
                  <Box sx={{ fontWeight: 600, textAlign: 'center', fontSize: '1rem', p: 0.5 }}>Y</Box>
                  <Box sx={{ fontWeight: 600, textAlign: 'center', fontSize: '1rem', p: 0.5 }}>Z</Box>
                  
                  {['A', 'B', 'C'].map((abc) => (
                    <>
                      <Box key={`label-${abc}`} sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', fontSize: '1rem', p: 0.5 }}>
                        {abc}
                      </Box>
                      {['X', 'Y', 'Z'].map((xyz) => {
                        const cell = abcXyzMatrix.find(
                          (c) => c.abc === abc && c.xyz === xyz
                        );
                        const bgColor = ABC_XYZ_COLORS[`${abc}${xyz}`] || '#ccc';
                        
                        return (
                          <Card
                            key={`${abc}${xyz}`}
                            elevation={1}
                            sx={{
                              bgcolor: `${bgColor}30`,
                              minHeight: 80,
                              maxHeight: 80,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              p: 1,
                              border: `1px solid ${bgColor}`,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              {cell ? cell.count : 0}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.75rem' }} color="text.secondary">
                              Products
                            </Typography>
                          </Card>
                        );
                      })}
                    </>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                  <Typography color="text.secondary">No data</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>

      {/* ABC Charts */}
      <Typography variant="h6" gutterBottom sx={{ mb: 1, mt: 1, fontWeight: 600 }}>
        ABC Analysis
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap', transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Article Count by ABC Category
            </Typography>
            {abcCount.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: abcCount.map(d => d.category),
                  tickLabelStyle: {
                    fontSize: 14,
                    fontWeight: 500,
                  },
                  colorMap: {
                    type: 'ordinal',
                    colors: [ABC_COLORS.A, ABC_COLORS.B, ABC_COLORS.C],
                    values: abcCount.map(d => d.category),
                  },
                }]}
                yAxis={[{
                  tickLabelStyle: {
                    fontSize: 12,
                  },
                  min: 0,
                  max: Math.ceil(Math.max(...abcCount.map(d => d.count || 0)) * 1.1),
                  tickMinStep: (() => {
                    const counts = abcCount.map(d => d.count || 0);
                    const maxVal = Math.max(...counts);
                    const range = maxVal;
                    if (range < 10) return 1;
                    if (range < 50) return 5;
                    if (range < 100) return 10;
                    if (range < 500) return 50;
                    return Math.ceil(range / 5 / 100) * 100;
                  })(),
                }]}
                series={[{ 
                  data: abcCount.map(d => d.count || 0),
                  label: 'Count of Articles',
                  valueFormatter: (value: number | null) => value?.toLocaleString('en-IN') || '0',
                }]}
                  height={310}
                margin={{ top: 20, bottom: 0, left: 10, right: 10 }}
                grid={{ vertical: false, horizontal: true }}
                barLabel="value"
                slotProps={{
                  barLabel: {
                    placement: 'outside',
                    style: {
                      fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                      fontWeight: 600,
                      fontSize: 14,
                      transform: 'translateY(-5px)',
                      zIndex: 2,
                    },
                  },
                }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Revenue of Articles by ABC Category
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Values in Crores (Cr)
            </Typography>
            {abcRevenue.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: abcRevenue.map(d => d.category),
                  tickLabelStyle: {
                    fontSize: 14,
                    fontWeight: 500,
                  },
                  colorMap: {
                    type: 'ordinal',
                    colors: [ABC_COLORS.A, ABC_COLORS.B, ABC_COLORS.C],
                    values: abcRevenue.map(d => d.category),
                  },
                }]}
                yAxis={[{
                  tickLabelStyle: {
                    fontSize: 12,
                    fontWeight: 500,
                  },
                  valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                    if (context.location === 'tick') {
                      // Short format for axis ticks
                      if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                      if (value >= 100) return `₹${value.toFixed(0)}`;
                      if (value >= 10) return `₹${value.toFixed(0)}`;
                      return `₹${value.toFixed(0)}`;
                    }
                    // Full format for tooltips
                    return `₹${value.toFixed(2)}M`;
                  },
                  min: 0,
                  max: Math.ceil(Math.max(...abcRevenue.map(d => d.revenue || 0)) * 1.1),
                  tickMinStep: (() => {
                    const revenues = abcRevenue.map(d => d.revenue || 0);
                    const maxVal = Math.max(...revenues);
                    const range = maxVal;
                    if (range < 10) return 1;
                    if (range < 50) return 5;
                    if (range < 100) return 10;
                    if (range < 500) return 50;
                    return Math.ceil(range / 5 / 100) * 100;
                  })(),
                }]}
                series={[{ 
                  data: abcRevenue.map(d => d.revenue || 0),
                  label: 'Revenue of Articles (Cr)',
                  valueFormatter: (value: number | null) => value ? `₹${(value / 10).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` : '₹0 Cr',
                }]}
                  height={295}
                margin={{ top: 20, bottom: 0, left: 10, right: 10 }}
                grid={{ vertical: false, horizontal: true }}
                barLabel={(item) => {
                  const value = item.value as number;
                  return `₹${(value / 10).toFixed(1)} Cr`;
                }}
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
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* XYZ Charts */}
      <Typography variant="h6" gutterBottom sx={{ mb: 1, mt: 1, fontWeight: 600 }}>
        XYZ Analysis
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap', transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Article Count by XYZ Category
            </Typography>
            {xyzCount.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: xyzCount.map(d => d.category),
                  tickLabelStyle: {
                    fontSize: 14,
                    fontWeight: 500,
                  },
                }]}
                yAxis={[{
                  tickLabelStyle: {
                    fontSize: 12,
                  },
                  width: 70,
                  min: 0,
                  max: Math.ceil(Math.max(...xyzCount.map(d => d.count || 0)) * 1.1),
                  tickMinStep: (() => {
                    const counts = xyzCount.map(d => d.count || 0);
                    const maxVal = Math.max(...counts);
                    const range = maxVal;
                    if (range < 10) return 1;
                    if (range < 50) return 5;
                    if (range < 100) return 10;
                    if (range < 500) return 50;
                    return Math.ceil(range / 5 / 100) * 100;
                  })(),
                }]}
                series={[{ 
                  data: xyzCount.map(d => d.count || 0), 
                  color: XYZ_COLORS.Y, // Orange
                  label: 'Count of Articles',
                  valueFormatter: (value: number | null) => value?.toLocaleString('en-IN') || '0',
                }]}
                  height={330}
                margin={{ top: 20, bottom: 0, left: 10, right: 10 }}
                grid={{ vertical: false, horizontal: true }}
                barLabel="value"
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
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
              Revenue of Articles by XYZ Category
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Values in Crores (Cr)
            </Typography>
            {xyzRevenue.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: xyzRevenue.map(d => d.category),
                  tickLabelStyle: {
                    fontSize: 14,
                    fontWeight: 500,
                  },
                }]}
                yAxis={[{
                  tickLabelStyle: {
                    fontSize: 12,
                    fontWeight: 500,
                  },
                  valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                    if (context.location === 'tick') {
                      // Short format for axis ticks
                      if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                      if (value >= 100) return `₹${value.toFixed(0)}`;
                      if (value >= 10) return `₹${value.toFixed(0)}`;
                      return `₹${value.toFixed(0)}`;
                    }
                    // Full format for tooltips
                    return `₹${value.toFixed(2)}M`;
                  },
                  min: 0,
                  max: Math.ceil(Math.max(...xyzRevenue.map(d => d.revenue || 0)) * 1.1),
                  tickMinStep: (() => {
                    const revenues = xyzRevenue.map(d => d.revenue || 0);
                    const maxVal = Math.max(...revenues);
                    const range = maxVal;
                    if (range < 10) return 1;
                    if (range < 50) return 5;
                    if (range < 100) return 10;
                    if (range < 500) return 50;
                    return Math.ceil(range / 5 / 100) * 100;
                  })(),
                }]}
                series={[{ 
                  data: xyzRevenue.map(d => d.revenue || 0), 
                  color: XYZ_COLORS.Z, // Red
                  label: 'Revenue of Articles (Cr)',
                  valueFormatter: (value: number | null) => value ? `₹${(value / 10).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` : '₹0 Cr',
                  barLabelPlacement:"outside"
                }]}
                  height={315}
                  margin={{ top: 20, bottom: 0, left: 10, right: 10 }}

                grid={{ vertical: false, horizontal: true }}
                barLabel={(item) => {
                  const value = item.value as number;
                  return `₹${(value / 10).toFixed(1)} Cr`;
                }}
                slotProps={{
                  barLabel: {
                    placement: 'outside',
                    style: {
                      fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                      fontWeight: 600,
                      fontSize: 14,
                      transform: 'translateY(-5px)',
                    },
                  },
                }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>


    </Box>
  );
};
export default Dashboard;
