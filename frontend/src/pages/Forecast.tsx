import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Paper,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { forecastApi } from '../api';
import type { ForecastResponse } from '../api/types';

const Forecast: React.FC = () => {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
      
      <Paper elevation={1} sx={{ flex: 1, width: '100%', maxWidth: 900, mx: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
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
