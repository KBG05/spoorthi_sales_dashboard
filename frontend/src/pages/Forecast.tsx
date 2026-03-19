import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  ListSubheader,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { forecastApi } from '../api';
import type { ForecastResponse } from '../api/types';

import { ABC_XYZ_COLORS, formatQuantity, withAlpha } from '../constants/constants';

const GRANULARITY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  bimonthly: 'Bimonthly',
  quarterly: 'Quarterly',
};

const GRANULARITY_ORDER = ['monthly', 'bimonthly', 'quarterly'];

const Forecast: React.FC = () => {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState('monthly');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [searchTexts, setSearchTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await forecastApi.getDemandForecast(granularity);
        setData(result);
      } catch (error) {
        console.error('Error fetching forecast:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [granularity]);

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'article_no',
      headerName: 'Article No',
      flex: 1,
      minWidth: 130,
    },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      minWidth: 130,
    },
    {
      field: 'abc_xyz',
      headerName: 'ABC/XYZ',
      flex: 0.6,
      minWidth: 80,
      renderCell: (params) => {
        const val = String(params.value || '').toUpperCase();
        const color = ABC_XYZ_COLORS[val];
        return (
          <Box sx={{ fontWeight: 600, color: color || 'inherit', bgcolor: color ? withAlpha(color, 0.12) : 'inherit', px: 1, borderRadius: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
            {params.value || '-'}
          </Box>
        );
      },
    },
    {
      field: 'unique_customers',
      headerName: 'Unique Customers',
      flex: 0.8,
      minWidth: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => value?.toLocaleString() ?? '-',
    },
    {
      field: 'last_3_months_quantity',
      headerName: 'Avg Last 3M Qty',
      flex: 0.9,
      minWidth: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) =>
        value !== undefined && value !== null
          ? value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '-',
    },
    {
      field: 'month_1_quantity',
      headerName: data?.month_1_name ? `${data.month_1_name} Qty` : 'Month 1 Qty',
      flex: 0.8,
      minWidth: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) =>
        value !== undefined && value !== null
          ? value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '-',
    },
    {
      field: 'month_2_quantity',
      headerName: data?.month_2_name ? `${data.month_2_name} Qty` : 'Month 2 Qty',
      flex: 0.8,
      minWidth: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) =>
        value !== undefined && value !== null
          ? value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '-',
    },
    {
      field: 'month_3_quantity',
      headerName: data?.month_3_name ? `${data.month_3_name} Qty` : 'Month 3 Qty',
      flex: 0.8,
      minWidth: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) =>
        value !== undefined && value !== null
          ? value.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '-',
    },
    {
      field: 'predicted_quantity',
      headerName: 'Predicted Quantity',
      flex: 0.9,
      minWidth: 130,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) =>
        value !== undefined && value !== null ? formatQuantity(value) : '-',
    },
  ], [data]);

  const rows = data?.data.map((row, index) => ({
    id: index,
    article_no: row.article_no,
    category: row.category || '-',
    abc_xyz: row.abc_xyz || '-',
    unique_customers: row.unique_customers,
    last_3_months_quantity: row.last_3_months_quantity,
    month_1_quantity: row.month_1_quantity,
    month_2_quantity: row.month_2_quantity,
    month_3_quantity: row.month_3_quantity,
    predicted_quantity: row.predicted_quantity,
  })) || [];

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      return Object.entries(columnFilters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String((row as any)[column] || '');
        return cellValue === filterValue;
      });
    });
  }, [rows, columnFilters]);

  const totalPredictedQuantity = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + (row.predicted_quantity || 0), 0);
  }, [filteredRows]);

  const getUniqueValues = (columnName: string) => {
    const values = rows.map(row => (row as any)[columnName]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const filterableColumns = [
    { field: 'article_no', label: 'Article No' },
    { field: 'category', label: 'Category' },
    { field: 'abc_xyz', label: 'ABC/XYZ' },
  ];

  const orderedGranularities = useMemo(() => {
    const source = data?.available_granularities ?? GRANULARITY_ORDER;
    return [...source].sort((a, b) => {
      const aIndex = GRANULARITY_ORDER.indexOf(a);
      const bIndex = GRANULARITY_ORDER.indexOf(b);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return safeA - safeB;
    });
  }, [data?.available_granularities]);

  const forecastedPeriodTitle = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) return '';
    
    const forecastPeriod = data.data[0].forecast_period;
    const formattedPeriod = forecastPeriod.replace(' - ', ' to ');
    return `Forecast Period: ${formattedPeriod}`;
  }, [data]);

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box display="flex" flexDirection="column" height="100%" p={2.5}>
        <Typography>No forecast data available</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%" minHeight={0} overflow="hidden" p={2.5}>
      <Typography variant="h6" gutterBottom>
        Demand Forecast
      </Typography>

      {/* Granularity Toggle */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={granularity}
          exclusive
          onChange={(_, val) => { if (val) setGranularity(val); }}
          size="small"
        >
          {orderedGranularities.map((g) => (
            <ToggleButton key={g} value={g} sx={{ textTransform: 'capitalize', px: 3 }}>
              {GRANULARITY_LABELS[g] || g}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

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
        {filterableColumns.map(({ field, label }) => {
          const uniqueValues = getUniqueValues(field);
          const searchText = searchTexts[field] || '';
          const filteredValues = uniqueValues.filter(value =>
            String(value).toLowerCase().includes(searchText.toLowerCase())
          );

          return (
            <FormControl key={field} size="small" sx={{ minWidth: 250 }}>
              <InputLabel>{label}</InputLabel>
              <Select
                value={columnFilters[field] || ''}
                label={label}
                onChange={(e) => {
                  setColumnFilters(prev => ({
                    ...prev,
                    [field]: e.target.value,
                  }));
                }}
                onClose={() => {
                  setSearchTexts(prev => ({ ...prev, [field]: '' }));
                }}
                MenuProps={{
                  autoFocus: false,
                  PaperProps: { style: { maxHeight: 400 } },
                }}
              >
                <ListSubheader>
                  <TextField
                    size="small"
                    autoFocus
                    placeholder="Type to search..."
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    value={searchText}
                    onChange={(e) => {
                      setSearchTexts(prev => ({ ...prev, [field]: e.target.value }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Escape') e.stopPropagation();
                    }}
                  />
                </ListSubheader>
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {filteredValues.map((value) => (
                  <MenuItem key={String(value)} value={String(value)}>
                    {String(value)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })}
      </Box>

      {/* Total Predicted Quantity Summary */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {forecastedPeriodTitle}
        </Typography>
        <Paper elevation={1} sx={{ px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Predicted Quantity:
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {formatQuantity(totalPredictedQuantity)}
          </Typography>
        </Paper>
      </Box>

      <Paper elevation={1} sx={{ flex: 1, width: '100%', minHeight: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: false,
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: false },
            },
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRight: '1px solid',
              borderColor: 'divider',
              py: 1.5,
            },
            '& .MuiDataGrid-columnHeaders': {
              fontWeight: 600,
              bgcolor: 'background.paper',
              borderBottom: '2px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeader': {
              borderRight: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnSeparator': {
              display: 'none',
            },
            height: '100%',
          }}
          disableRowSelectionOnClick
          rowHeight={52}
        />
      </Paper>
    </Box>
  );
};

export default Forecast;
