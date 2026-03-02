import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Paper,
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

import { ABC_COLORS, formatQuantity } from '../constants/constants';

const Forecast: React.FC = () => {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [searchTexts, setSearchTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await forecastApi.getDemandForecast();
        console.log('Forecast data received:', result);
        console.log('Month names:', result.month_1_name, result.month_2_name, result.month_3_name);
        setData(result);
      } catch (error) {
        console.error('Error fetching forecast:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'product_id',
      headerName: 'Product ID',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'product_names',
      headerName: 'Product Names',
      flex: 3,
      minWidth: 200,
      valueFormatter: (value: string[]) => value?.join(', ') ?? '-',
    },
    {
      field: 'category',
      headerName: 'Category',
      flex: 0.7,
      minWidth: 80,
      renderCell: (params) => {
        const value = String(params.value || '').toUpperCase();
        let color = ABC_COLORS.Unknown;
        // AZ is red (danger), CX is orange (low risk), others green
        if (value === 'AZ') color = ABC_COLORS.A;
        else if (value === 'CX') color = ABC_COLORS.C;
        else if (value && value.length === 2) color = ABC_COLORS.B;
        return (
          <Box sx={{ fontWeight: 600, color }}>
            {params.value || '-'}
          </Box>
        );
      },
    },
    {
      field: 'unique_customers',
      headerName: 'Unique Customers',
      flex: 1,
      minWidth: 120,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => value?.toLocaleString() ?? '-',
    },
    {
      field: 'last_3_months_quantity',
      headerName: 'Avg Last 3M Qty',
      flex: 1,
      minWidth: 130,
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
      flex: 1,
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
      flex: 1,
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
      flex: 1,
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
      flex: 1.1,
      minWidth: 130,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => 
        value !== undefined && value !== null 
          ? formatQuantity(value)
          : '-',
    },
  ], [data]);

  const rows = data?.data.map((row, index) => ({
    id: index,
    product_id: row.product_id,
    product_names: row.product_names,
    category: row.category || '-',
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

  // Only filter by Product ID (removed Forecast Month filter)
  const filterableColumns = [
    { field: 'product_id', label: 'Product ID' },
    { field: 'category', label: 'Category' },
  ];

  if (loading) {
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
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h6" gutterBottom>
        {data.display_month}
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
                  PaperProps: {
                    style: {
                      maxHeight: 400,
                    },
                  },
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
                      setSearchTexts(prev => ({
                        ...prev,
                        [field]: e.target.value,
                      }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Escape') {
                        e.stopPropagation();
                      }
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Paper elevation={1} sx={{ px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Predicted Quantity:
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {formatQuantity(totalPredictedQuantity)}
          </Typography>
        </Paper>
      </Box>
      
      <Paper elevation={1} sx={{ width: '100%', height: 'calc(100vh - 280px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
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
          }}
          disableRowSelectionOnClick
          rowHeight={52}
        />
      </Paper>
    </Box>
  );
};

export default Forecast;
