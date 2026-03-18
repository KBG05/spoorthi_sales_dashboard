import { Box, Typography, Paper, Button } from '@mui/material';
import { Download } from '@mui/icons-material';
import { apiClient } from '../api/client';

const ExportData = () => {
  const handleDownload = async (endpoint: string, filename: string) => {
    try {
      const response = await apiClient.get(`/dashboard/export/${endpoint}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const exportCards = [
    {
      title: 'Rolling ABC/XYZ Analysis',
      description: 'Downloads the full results from the latest monthly rolling ABC/XYZ summary table.',
      buttonText: 'DOWNLOAD ROLLING ABC/XYZ',
      endpoint: 'rolling-abc-xyz',
      filename: 'rolling_abc_xyz_analysis.csv',
      buttonColor: '#0288d1',
    },
    {
      title: 'Customer ABC/XYZ (FY)',
      description: 'Downloads the Customer ABC/XYZ classification for the latest financial year.',
      buttonText: 'DOWNLOAD CUSTOMER ABC/XYZ FY',
      endpoint: 'customer-abc-xyz-fy',
      filename: 'customer_abc_xyz_fy.csv',
      buttonColor: '#7b1fa2',
    },
    {
      title: 'Demand Forecast',
      description: 'Downloads Product ID, Forecast Month, and Predicted Quantity from the latest forecast table.',
      buttonText: 'DOWNLOAD FORECAST',
      endpoint: 'forecast',
      filename: 'demand_forecast.csv',
      buttonColor: '#2e7d32',
    },
    {
      title: 'Cross-Sell Recommendations',
      description: 'Downloads Distributor Code, Products Bought Together, and Suggested Product from the latest cross-sell table.',
      buttonText: 'DOWNLOAD CROSS-SELL',
      endpoint: 'cross-sell',
      filename: 'cross_sell_recommendations.csv',
      buttonColor: '#00acc1',
    },
    {
      title: 'RFM Monthly Scores',
      description: 'Downloads the latest monthly RFM (Recency, Frequency, Monetary) segmentation scores.',
      buttonText: 'DOWNLOAD RFM SCORES',
      endpoint: 'rfm-monthly',
      filename: 'rfm_monthly_scores.csv',
      buttonColor: '#ef6c00',
    },
  ];

  return (
    <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>
        Download Latest Analysis Results
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Click the buttons below to download the most recent results for each analysis as a CSV file.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {exportCards.map((card, index) => (
          <Paper
            key={index}
            elevation={1}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
              {card.title}
            </Typography>
            
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3, flexGrow: 1 }}
            >
              {card.description}
            </Typography>

            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => handleDownload(card.endpoint, card.filename)}
              sx={{
                bgcolor: card.buttonColor,
                color: 'white',
                fontWeight: 600,
                py: 1.25,
                '&:hover': {
                  bgcolor: card.buttonColor,
                  opacity: 0.9,
                },
              }}
            >
              {card.buttonText}
            </Button>
          </Paper>
        ))}
      </Box>

    </Box>
  );
};

export default ExportData;
