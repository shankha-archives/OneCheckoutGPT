import React, { useContext, useEffect, useState } from 'react';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Button, Box, Chip, CircularProgress, Alert } from '@mui/material';
import { CartContext } from '../context/CartContext';
import SmartSearchBar from '../components/SmartSearchBar';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';

const ProductCatalog = () => {
  const { addToCart } = useContext(CartContext);
  const [devices, setDevices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to fetch data from backend first
        const [devicesResponse, plansResponse] = await Promise.all([
          fetch('http://localhost:8000/api/devices'),
          fetch('http://localhost:8000/api/plans')
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
        setError("Failed to load products. Using fallback data.");
        
        // Fall back to local data
        try {
          const [devicesData, plansData] = await Promise.all([
            fetch('/data/devices.json').then(res => res.json()),
            fetch('/data/plans.json').then(res => res.json())
          ]);
          
          setDevices(devicesData);
          setPlans(plansData);
        } catch (fallbackErr) {
          console.error("Error loading fallback data:", fallbackErr);
          setError("Failed to load products. Please refresh the page.");
        }
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