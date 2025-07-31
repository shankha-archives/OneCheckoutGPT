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
        <SmartSearchBar devices={devices} plans={plans} />
        
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 6, mb: 4, fontWeight: 'bold' }}>
            Featured Devices
          </Typography>
          <Grid container spacing={4}>
            {devices.map((device) => (
              <Grid item xs={12} sm={6} md={4} key={device.id}>
                <ProductCard 
                  device={device} 
                  defaultPlan={plans[0]} 
                  allPlans={plans} 
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default ProductCatalog;