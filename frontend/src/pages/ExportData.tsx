import { Box, Typography, Paper, Button } from '@mui/material';
import { Download } from '@mui/icons-material';
import { downloadExport } from '../utils/download';

const ExportData = () => {
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
      description: 'Downloads Article No, Article Description, ABC Category (latest ABC run), and Monthly/Bimonthly/Quarterly forecasts for all forecast runs as CSV.',
      buttonText: 'DOWNLOAD FORECAST',
      endpoint: 'forecast',
      filename: 'demand_forecast.csv',
      buttonColor: '#2e7d32',
    },
    {
      title: 'Demand Forecast (Excel)',
      description: 'Same as Demand Forecast, as an Excel file with readable headers (Article No, Article Description, ABC Category, Monthly Period, ...).',
      buttonText: 'DOWNLOAD FORECAST XLSX',
      endpoint: 'forecast?format=xlsx',
      filename: 'demand_forecast.xlsx',
      buttonColor: '#1b5e20',
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
    {
      title: 'Ticket Size (High-Value Bands)',
      description: 'Downloads Customers and Products in the 20L-50L, 50L-1CR, and 1CR+ revenue bands for the 3 most recent financial years, one sheet per year, with their ticket band and revenue.',
      buttonText: 'DOWNLOAD TICKET SIZE',
      endpoint: 'ticket-size',
      filename: 'ticket_size_high_value_bands.xlsx',
      buttonColor: '#5e35b1',
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
              onClick={() => downloadExport(card.endpoint, card.filename)}
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
