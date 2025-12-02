import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  type SelectChangeEvent,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { ScatterChart } from '@mui/x-charts/ScatterChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { cbaApi } from '../api';
import type { RFMMetrics, RFMSummary, SegmentData } from '../api/types';

// Segment colors matching R code
const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#2ecc71',
  'Loyal Customers': '#3498db',
  'New Customers': '#9b59b6',
  'Potential Loyalists': '#1abc9c',
  'At Risk': '#e67e22',
  'Lost Customers': '#e74c3c',
  'Regular Customers': '#95a5a6',
};

interface HistogramBin {
  label: string;
  count: number;
  rangeStart: number;
  rangeEnd: number;
  [key: string]: string | number; // Add index signature for dataset compatibility
}

const CBA = () => {
  const [timePeriod, setTimePeriod] = useState<number>(12);
  const [binWidth, setBinWidth] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [rfmData, setRfmData] = useState<RFMMetrics[]>([]);
  const [summary, setSummary] = useState<RFMSummary | null>(null);
  const [segments, setSegments] = useState<SegmentData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rfmResponse, summaryResponse, segmentResponse] = await Promise.all([
          cbaApi.getRFMAnalysis(timePeriod),
          cbaApi.getSummary(timePeriod),
          cbaApi.getSegments(timePeriod),
        ]);
        setRfmData(rfmResponse);
        setSummary(summaryResponse);
        setSegments(segmentResponse);
      } catch (err) {
        console.error('Error fetching CBA data:', err);
        setError('Failed to load CBA data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod]);

  // Helper function to create histogram bins
  const createHistogramBins = (
    values: number[],
    binWidth: number
  ): HistogramBin[] => {
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const numBins = Math.ceil((max - min) / binWidth);

    const bins: HistogramBin[] = [];
    for (let i = 0; i < numBins; i++) {
      const rangeStart = min + i * binWidth;
      const rangeEnd = rangeStart + binWidth;
      const count = values.filter((v) => v >= rangeStart && v < rangeEnd).length;

      // Handle last bin to include max value
      const isLastBin = i === numBins - 1;
      const finalCount = isLastBin
        ? values.filter((v) => v >= rangeStart && v <= rangeEnd).length
        : count;

      bins.push({
        label: `${rangeStart.toFixed(0)}-${rangeEnd.toFixed(0)}`,
        count: finalCount,
        rangeStart,
        rangeEnd,
      });
    }

    return bins;
  };

  // Note: Regression line calculation removed as MUI X Charts ScatterChart 
  // doesn't support overlaying line series. Can be added with custom SVG overlay if needed.

  // Prepare histogram data
  const recencyBins = useMemo(
    () => createHistogramBins(rfmData.map((d) => d.recency), binWidth),
    [rfmData, binWidth]
  );
  const frequencyBins = useMemo(
    () => createHistogramBins(rfmData.map((d) => d.frequency), binWidth),
    [rfmData, binWidth]
  );
  const monetaryBins = useMemo(
    () =>
      createHistogramBins(
        rfmData.map((d) => d.monetary / 1_000_000),
        binWidth
      ),
    [rfmData, binWidth]
  );

  // Prepare scatter plot data
  const scatterRecencyMonetary = useMemo(
    () =>
      rfmData.map((d) => ({
        x: d.recency,
        y: d.monetary / 1_000_000,
        id: d.customer_id,
      })),
    [rfmData]
  );

  const scatterFrequencyMonetary = useMemo(
    () =>
      rfmData.map((d) => ({
        x: d.frequency,
        y: d.monetary / 1_000_000,
        id: d.customer_id,
      })),
    [rfmData]
  );

  const scatterRecencyFrequency = useMemo(
    () =>
      rfmData.map((d) => ({
        x: d.recency,
        y: d.frequency,
        id: d.customer_id,
      })),
    [rfmData]
  );

  // Prepare segment data
  const sortedSegments = useMemo(() => {
    const order = [
      'Champions',
      'Loyal Customers',
      'Potential Loyalists',
      'New Customers',
      'Regular Customers',
      'At Risk',
      'Lost Customers',
    ];
    return segments.sort((a, b) => order.indexOf(a.segment) - order.indexOf(b.segment));
  }, [segments]);

  const handleTimePeriodChange = (event: SelectChangeEvent<number>) => {
    setTimePeriod(event.target.value as number);
  };

  const handleBinWidthChange = (_event: Event, newValue: number | number[]) => {
    setBinWidth(newValue as number);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Customer Behaviour Analysis (CBA)
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Period</InputLabel>
          <Select
            value={timePeriod}
            onChange={handleTimePeriodChange}
            label="Time Period"
          >
            <MenuItem value={3}>3 Months</MenuItem>
            <MenuItem value={6}>6 Months</MenuItem>
            <MenuItem value={12}>12 Months</MenuItem>
            <MenuItem value={24}>24 Months</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ minWidth: 250, px: 2 }}>
          <Typography gutterBottom>Histogram Bin Width: {binWidth}</Typography>
          <Slider
            value={binWidth}
            onChange={handleBinWidthChange}
            min={1}
            max={10}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>

      {/* Summary Statistics */}
      {summary && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Summary Statistics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Card sx={{ flex: '1 1 calc(20% - 16px)', minWidth: 180 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Avg Recency
                </Typography>
                <Typography variant="h5">{summary.avg_recency.toFixed(1)}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 calc(20% - 16px)', minWidth: 180 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Avg Frequency
                </Typography>
                <Typography variant="h5">{summary.avg_frequency.toFixed(1)}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 calc(20% - 16px)', minWidth: 180 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Avg Monetary
                </Typography>
                <Typography variant="h5">
                  ₹{summary.avg_monetary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 calc(20% - 16px)', minWidth: 180 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Customers
                </Typography>
                <Typography variant="h5">{summary.total_customers}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 calc(20% - 16px)', minWidth: 180 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Revenue
                </Typography>
                <Typography variant="h5">
                  ₹{summary.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      )}

      {/* Histograms */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Distribution Analysis
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Paper sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 300, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Recency Distribution
          </Typography>
          <BarChart
            dataset={recencyBins}
            xAxis={[{ scaleType: 'band', dataKey: 'label', label: 'Months Since Last Purchase' }]}
            yAxis={[{ label: 'Number of Customers' }]}
            series={[{ dataKey: 'count', color: '#3498db', label: 'Count' }]}
            height={320}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
        <Paper sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 300, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Frequency Distribution
          </Typography>
          <BarChart
            dataset={frequencyBins}
            xAxis={[{ scaleType: 'band', dataKey: 'label', label: 'Number of Purchase Periods' }]}
            yAxis={[{ label: 'Number of Customers' }]}
            series={[{ dataKey: 'count', color: '#2ecc71', label: 'Count' }]}
            height={320}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
        <Paper sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 300, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Monetary Distribution (M)
          </Typography>
          <BarChart
            dataset={monetaryBins}
            xAxis={[{ scaleType: 'band', dataKey: 'label', label: 'Total Revenue' }]}
            yAxis={[{ label: 'Number of Customers' }]}
            series={[{ dataKey: 'count', color: '#e74c3c', label: 'Count' }]}
            height={320}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
      </Box>

      {/* Scatter Plots */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Relationship Analysis
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Paper sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 300, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Recency vs Monetary
          </Typography>
          <Box sx={{ position: 'relative', height: 320 }}>
            <ScatterChart
              series={[
                {
                  data: scatterRecencyMonetary,
                  color: '#3498db',
                  label: 'Customers',
                },
              ]}
              xAxis={[{ label: 'Months Since Last Purchase' }]}
              yAxis={[{ 
                label: 'Total Revenue',
                valueFormatter: (value: number | null, context: AxisValueFormatterContext) => {
                  if (value === null) return '₹0M';
                  if (context.location === 'tick') {
                    return `₹${value.toFixed(0)}M`;
                  }
                  return `₹${value.toFixed(1)}M`;
                }
              }]}
              height={320}
              grid={{ vertical: true, horizontal: true }}
            />
          </Box>
        </Paper>
        <Paper sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 300, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Frequency vs Monetary
          </Typography>
          <Box sx={{ position: 'relative', height: 320 }}>
            <ScatterChart
              series={[
                {
                  data: scatterFrequencyMonetary,
                  color: '#2ecc71',
                  label: 'Customers',
                },
              ]}
              xAxis={[{ label: 'Number of Purchase Periods' }]}
              yAxis={[{ 
                label: 'Total Revenue',
                valueFormatter: (value: number | null, context: AxisValueFormatterContext) => {
                  if (value === null) return '₹0M';
                  if (context.location === 'tick') {
                    return `₹${value.toFixed(0)}M`;
                  }
                  return `₹${value.toFixed(1)}M`;
                }
              }]}
              height={320}
              grid={{ vertical: true, horizontal: true }}
            />
          </Box>
        </Paper>
        <Paper sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 300, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Recency vs Frequency
          </Typography>
          <Box sx={{ position: 'relative', height: 320 }}>
            <ScatterChart
              series={[
                {
                  data: scatterRecencyFrequency,
                  color: '#9b59b6',
                  label: 'Customers',
                },
              ]}
              xAxis={[{ label: 'Months Since Last Purchase' }]}
              yAxis={[{ label: 'Number of Purchase Periods' }]}
              height={320}
              grid={{ vertical: true, horizontal: true }}
            />
          </Box>
        </Paper>
      </Box>

      {/* Segment Analysis */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Customer Segmentation
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper sx={{ flex: '1 1 calc(50% - 16px)', minWidth: 600, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Customer Count by Segment
          </Typography>
          <BarChart
            layout="horizontal"
            dataset={sortedSegments}
            yAxis={[
              {
                scaleType: 'band',
                dataKey: 'segment',
                tickLabelStyle: {
                  fontSize: 13,
                },
              },
            ]}
            xAxis={[{ label: 'Number of Customers' }]}
            series={[
              {
                dataKey: 'customer_count',
                label: 'Customers',
                valueFormatter: (value) => value?.toString() || '0',
              },
            ]}
            colors={sortedSegments.map((s) => SEGMENT_COLORS[s.segment])}
            height={320}
            margin={{ left: 100, bottom: 50, right: 10, top: 10 }}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
        <Paper sx={{ flex: '1 1 calc(50% - 16px)', minWidth: 600, p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Revenue by Segment (M)
          </Typography>
          <BarChart
            layout="horizontal"
            dataset={sortedSegments.map((s) => ({
              ...s,
              revenue_millions: s.total_revenue / 1_000_000,
            }))}
            yAxis={[
              {
                scaleType: 'band',
                dataKey: 'segment',
                tickLabelStyle: {
                  fontSize: 13,
                },
              },
            ]}
            xAxis={[{ 
              label: 'Total Revenue',
              valueFormatter: (value: number | null, context: AxisValueFormatterContext) => {
                if (value === null) return '0M';
                if (context.location === 'tick') {
                  return `${value.toFixed(0)}M`;
                }
                return `${value.toFixed(1)}M`;
              }
            }]}
            series={[
              {
                dataKey: 'revenue_millions',
                label: 'Revenue (M ₹)',
                valueFormatter: (value) => `₹${value?.toFixed(2) || '0'}M`,
              },
            ]}
            colors={sortedSegments.map((s) => SEGMENT_COLORS[s.segment])}
            height={320}
            margin={{ left: 100, bottom: 50, right: 10, top: 10 }}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default CBA;
