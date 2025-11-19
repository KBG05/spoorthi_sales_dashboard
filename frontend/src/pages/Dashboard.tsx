import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Paper, CircularProgress } from '@mui/material';
import { ShoppingCart } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { dashboardApi } from '../api';
import type { KPIResponse } from '../api/types';

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

interface ComboData {
  abc_category: string;
  xyz_category: string;
  abc_xyz: string;
  count: number;
}

const Dashboard = () => {
  const [kpiData, setKpiData] = useState<KPIResponse | null>(null);
  const [abcCount, setAbcCount] = useState<CategoryData[]>([]);
  const [abcRevenue, setAbcRevenue] = useState<CategoryData[]>([]);
  const [xyzCount, setXyzCount] = useState<CategoryData[]>([]);
  const [xyzRevenue, setXyzRevenue] = useState<CategoryData[]>([]);
  const [comboCount, setComboCount] = useState<ComboData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch each dataset independently to prevent one failure from stopping others
      const fetchKPIs = dashboardApi.getKPIs()
        .then(res => setKpiData(res.data))
        .catch(err => console.error('Error fetching KPIs:', err));
      
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
      
      const fetchCombo = dashboardApi.getABCXYZCount()
        .then(res => setComboCount(res.data))
        .catch(err => console.error('Error fetching ABC-XYZ combo:', err));
      
      // Wait for all to complete (success or failure)
      await Promise.allSettled([
        fetchKPIs,
        fetchABCCount,
        fetchABCRevenue,
        fetchXYZCount,
        fetchXYZRevenue,
        fetchCombo,
      ]);
      
      setLoading(false);
    };

    fetchData();
  }, []);

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
      color: '#00D25B'
    },
    { 
      title: 'Total Quantity', 
      value: kpiData ? formatNumber(kpiData.total_quantity) : '0',
      subtitle: kpiData?.month_name || 'N/A',
      icon: <ShoppingCart />,
      color: '#00D25B'
    },
  ];

  return (
    <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Monthly Performance Dashboard
      </Typography>

      {/* KPI Cards Row */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 4,
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

      {/* ABC Charts */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        ABC Analysis
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
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
                    colors: ['#00D25B', '#FCAB00', '#FF4747'],
                    values: abcCount.map(d => d.category),
                  },
                }]}
                yAxis={[{
                  tickLabelStyle: {
                    fontSize: 12,
                  },
                }]}
                series={[{ 
                  data: abcCount.map(d => d.count || 0),
                  label: 'Product Count',
                }]}
                height={300}
                margin={{ top: 50, bottom: 50, left: 60, right: 10 }}
                grid={{ vertical: false, horizontal: true }}
                slotProps={{
                  barLabel: {
                    style: {
                      fill: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                    },
                  },
                }}
                barLabel="value"
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Revenue by ABC Category
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Values in millions (M)
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
                    colors: ['#00D25B', '#FCAB00', '#FF4747'],
                    values: abcRevenue.map(d => d.category),
                  },
                }]}
                yAxis={[{
                  tickLabelStyle: {
                    fontSize: 12,
                  },
                  valueFormatter: (value) => `₹${value}M`,
                }]}
                series={[{ 
                  data: abcRevenue.map(d => d.revenue || 0),
                  label: 'Revenue (M)',
                  valueFormatter: (value) => value ? `₹${value.toFixed(2)}M` : '₹0M',
                }]}
                height={300}
                margin={{ top: 50, bottom: 50, left: 60, right: 10 }}
                grid={{ vertical: false, horizontal: true }}
                slotProps={{
                  barLabel: {
                    style: {
                      fill: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                    },
                  },
                }}
                barLabel={(item) => `₹${item.value?.toFixed(1)}M`}
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
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        XYZ Analysis
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
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
                }]}
                series={[{ 
                  data: xyzCount.map(d => d.count || 0), 
                  color: '#FCAB00',
                  label: 'Count',
                  valueFormatter: (value) => value?.toLocaleString() || '0',
                }]}
                height={300}
                margin={{ top: 50, bottom: 50, left: 60, right: 10 }}
                grid={{ vertical: false, horizontal: true }}
                slotProps={{
                  barLabel: {
                    style: {
                      fill: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                    },
                  },
                }}
                barLabel="value"
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 300, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
          <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Revenue by XYZ Category
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Values in millions (M)
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
                  },
                  valueFormatter: (value) => `₹${value}M`,
                }]}
                series={[{ 
                  data: xyzRevenue.map(d => d.revenue || 0), 
                  color: '#FF4747',
                  label: 'Revenue (M)',
                  valueFormatter: (value) => value ? `₹${value.toFixed(2)}M` : '₹0M',
                }]}
                height={300}
                margin={{ top: 50, bottom: 50, left: 60, right: 10 }}
                grid={{ vertical: false, horizontal: true }}
                slotProps={{
                  barLabel: {
                    style: {
                      fill: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                    },
                  },
                }}
                barLabel={(item) => `₹${item.value?.toFixed(1)}M`}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* ABC-XYZ Combination Chart */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        ABC-XYZ Combination Analysis
      </Typography>
      <Box sx={{ mb: 4, transition: 'all 150ms cubic-bezier(0.4, 0, 0.6, 1) 0ms' }}>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Article Count by ABC-XYZ Combination
          </Typography>
          {comboCount.length > 0 ? (
            <BarChart
              xAxis={[{ 
                scaleType: 'band', 
                data: comboCount.map(d => d.abc_xyz),
                tickLabelStyle: {
                  fontSize: 14,
                  fontWeight: 500,
                },
                colorMap: {
                  type: 'ordinal',
                  colors: comboCount.map(d => {
                    const abcCategory = d.abc_xyz.charAt(0);
                    if (abcCategory === 'A') return '#00D25B';
                    if (abcCategory === 'B') return '#FCAB00';
                    if (abcCategory === 'C') return '#FF4747';
                    return '#8B5CF6';
                  }),
                  values: comboCount.map(d => d.abc_xyz),
                },
              }]}
              yAxis={[{
                tickLabelStyle: {
                  fontSize: 12,
                },
              }]}
              series={[{ 
                data: comboCount.map(d => d.count), 
                label: 'Count',
                valueFormatter: (value) => value?.toLocaleString() || '0',
              }]}
              height={400}
              margin={{ top: 50, bottom: 50, left: 60, right: 10 }}
              grid={{ vertical: false, horizontal: true }}
              slotProps={{
                barLabel: {
                  style: {
                    fill: '#ffffff',
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
              }}
              barLabel={(item) => item.value?.toLocaleString() || '0'}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
              <Typography color="text.secondary">No data available</Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};
export default Dashboard;
