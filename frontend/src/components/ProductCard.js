import React, { useState, useContext } from 'react';
import { 
  Card, CardContent, CardMedia, Typography, Button, Box, 
  Chip, FormControl, Select, MenuItem, InputLabel
} from '@mui/material';
import { CartContext } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const ProductCard = ({ device, defaultPlan, allPlans }) => {
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  
  const handlePlanChange = (event) => {
    const planId = event.target.value;
    const plan = allPlans.find(p => p.id.toString() === planId.toString());
    setSelectedPlan(plan);
  };
  
  const handleAddToCart = () => {
    addToCart({
      id: `${device.id}-${selectedPlan.id}`,
      device,
      plan: selectedPlan,
      price: parseFloat(device.price) + parseFloat(selectedPlan.price),
      quantity: 1
    });
    navigate('/cart');
  };
  
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: 2,
      boxShadow: 3,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: 6
      }
    }}>
      <CardMedia
        component="img"
        height="200"
        image={device.image}
        alt={device.name}
        sx={{ 
          padding: 2,
          objectFit: 'contain',
          bgcolor: '#f8f9fa'
        }}
        onError={e => { e.target.onerror = null; e.target.src = "/images/no-image.png"; }}
      />
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" component="div" gutterBottom>
          {device.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {device.brand} • {device.storage}
        </Typography>
        
        <Box sx={{ my: 1 }}>
          {device.features.slice(0, 3).map((feature, index) => (
            <Chip 
              key={index} 
              label={feature} 
              size="small" 
              sx={{ mr: 0.5, mb: 0.5 }} 
            />
          ))}
        </Box>
        
        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
          €{device.price}
        </Typography>
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="plan-select-label">Select Plan</InputLabel>
          <Select
            labelId="plan-select-label"
            value={selectedPlan.id}
            label="Select Plan"
            onChange={handlePlanChange}
            size="small"
          >
            {allPlans.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                {plan.name} - €{plan.price}/mo - {plan.data}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          sx={{ mt: 2 }}
          onClick={handleAddToCart}
        >
          Add Bundle to Cart
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;