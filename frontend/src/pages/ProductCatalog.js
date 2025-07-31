import React, { useContext, useEffect, useState } from 'react';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Button, Box, Chip, CircularProgress, Alert, Paper } from '@mui/material';
import { CartContext } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';
import { Mic, Search, TrendingUp } from '@mui/icons-material';

const ProductCatalog = () => {
  const { addToCart } = useContext(CartContext);
  const [devices, setDevices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from the new backend
        const [devicesResponse, plansResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/devices`),
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/plans`)
        ]);

        if (!devicesResponse.ok || !plansResponse.ok) {
          throw new Error("API error");
        }

        const devicesData = await devicesResponse.json();
        const plansData = await plansResponse.json();

        // Process features to convert from string to array if needed
        const processedDevices = devicesData.map(device => ({
          ...device,
          features: Array.isArray(device.features) 
            ? device.features 
            : typeof device.features === 'string' 
              ? device.features.split(';') 
              : []
        }));

        const processedPlans = plansData.map(plan => ({
          ...plan,
          features: Array.isArray(plan.features) 
            ? plan.features 
            : typeof plan.features === 'string' 
              ? plan.features.split(';') 
              : []
        }));

        setDevices(processedDevices);
        setPlans(processedPlans);
      } catch (err) {
        console.error("Error fetching data from API:", err);
        setError("Failed to load products. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="xl">
        {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
        
        {/* Hero Section with Voice Call-to-Action */}
        <Box sx={{ textAlign: 'center', py: 6, mb: 4 }}>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
            Find Your Perfect Phone & Plan
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Discover the latest smartphones paired with the perfect data plan for your needs
          </Typography>
          
          {/* Voice Assistant Promotion */}
          <Paper 
            sx={{ 
              p: 3, 
              maxWidth: 500, 
              mx: 'auto', 
              bgcolor: 'primary.main', 
              color: 'white',
              borderRadius: 3,
              mb: 4
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Mic sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Try Our Voice Assistant!
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Just click the microphone button and tell me what you're looking for. 
              I'll ask questions to understand your needs and recommend the perfect bundle!
            </Typography>
          </Paper>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                {devices.length}+
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Latest Devices
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main', mb: 1 }}>
                {plans.length}+
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Flexible Plans
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                AI-Powered Recommendations
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 6, mb: 4, fontWeight: 'bold', textAlign: 'center' }}>
            Featured Devices
          </Typography>
          <Grid container spacing={4}>
            {devices.slice(0, 12).map((device) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={device.id}>
                <ProductCard 
                  device={device} 
                  defaultPlan={plans[0]} 
                  allPlans={plans} 
                />
              </Grid>
            ))}
          </Grid>
          
          {devices.length > 12 && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button variant="outlined" size="large" href="/plans">
                View All Plans & Devices
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
};

export default ProductCatalog;