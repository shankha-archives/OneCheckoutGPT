import React, { useContext, useEffect, useState } from 'react';
import { Container, Grid, Card, CardMedia, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import { CartContext } from '../context/CartContext';
import SmartSearchBar from '../components/SmartSearchBar';

const ProductCatalog = () => {
  const { addToCart } = useContext(CartContext);
  const [devices, setDevices] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetch('/data/devices.json').then(res => res.json()).then(setDevices);
    fetch('/data/plans.json').then(res => res.json()).then(setPlans);
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <SmartSearchBar devices={devices} plans={plans} />
      <Typography variant="h2" sx={{ mb: 2, fontWeight: 700, color: 'primary.main', textAlign: 'center' }}>
        Best Smartphone Deals
      </Typography>
      <Grid container spacing={3} justifyContent="center">
        {devices.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card sx={{ borderRadius: 3, boxShadow: 3, position: 'relative' }}>
              <CardMedia
                component="img"
                height="240"
                image={product.image}
                alt={product.name}
                sx={{ objectFit: 'contain', bgcolor: '#f8f8f8' }}
                onError={e => { e.target.onerror = null; e.target.src = "/images/no-image.png"; }}
              />
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{product.name}</Typography>
                <Box sx={{ mb: 2 }}>
                  {product.features.map((feature, idx) => (
                    <Chip key={idx} label={feature} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: '0.75rem' }} />
                  ))}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  €{product.price}
                </Typography>
                <Button fullWidth variant="contained" sx={{ mt: 2, borderRadius: 2, py: 1.5, fontWeight: 600 }} onClick={() => addToCart(product)}>
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ProductCatalog;