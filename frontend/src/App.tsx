import { Routes, Route, Navigate } from 'react-router';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { AppLayout } from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import ABCAnalysis from './pages/ABCAnalysis';
import CustomerTrend from './pages/CustomerTrend';
import CustomerBehaviour from './pages/CustomerBehaviour';
import ProductBehaviour from './pages/ProductBehaviour';
import CrossSell from './pages/CrossSell';
import TopPerformance from './pages/TopPerformance';
import TicketSize from './pages/TicketSize';
import Forecast from './pages/Forecast';
import TransitionAnalysis from './pages/TransitionAnalysis';
import ExportData from './pages/ExportData';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="abc-analysis" element={<ABCAnalysis />} />
        <Route path="customer-trend" element={<CustomerTrend />} />
        <Route path="customer-behaviour" element={<CustomerBehaviour />} />
        <Route path="ticket-size" element={<TicketSize />} />
        <Route path="product-behaviour" element={<ProductBehaviour />} />
        <Route path="transition-analysis" element={<TransitionAnalysis />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="top-performance" element={<TopPerformance />} />
        <Route path="cross-sell" element={<CrossSell />} />
        <Route path="export-data" element={<ExportData />} />
      </Route>
    </Routes>
  );
}

export default App;
