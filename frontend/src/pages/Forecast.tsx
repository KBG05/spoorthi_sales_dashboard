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
        setData(result);
      } catch (error) {
        console.error('Error fetching forecast:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns: GridColDef[] = [
    {
      field: 'product_id',
      headerName: 'Product ID',
      width: 225,
      minWidth: 180,
    },
    {
      field: 'forecast_month',
      headerName: 'Forecast Month',
      width: 300,
      minWidth: 225,
    },
    {
      field: 'predicted_quantity',
      headerName: 'Predicted Quantity',
      width: 270,
      minWidth: 225,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => value?.toLocaleString(),
    },
  ];

  const rows = data?.data.map((row, index) => ({
    id: index,
    product_id: row.product_id,
    forecast_month: row.forecast_month,
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

  const getUniqueValues = (columnName: string) => {
    const values = rows.map(row => (row as any)[columnName]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const filterableColumns = [
    { field: 'product_id', label: 'Product ID' },
    { field: 'forecast_month', label: 'Forecast Month' },
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
      
      <Paper elevation={1} sx={{ flex: 1, width: '100%', maxWidth: 900, mx: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
