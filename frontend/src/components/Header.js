import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Badge, IconButton, Box, Button } from '@mui/material';
import { ShoppingCart, Phone } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const Header = () => {
  const { items } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <AppBar position="static" color="default" elevation={2}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
          onClick={() => navigate('/')}
        >
          <Phone sx={{ mr: 1, color: 'primary.main' }} />
          ShoppingGPT
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            color={location.pathname === '/' ? 'primary' : 'inherit'}
            onClick={() => navigate('/')}
            sx={{ fontWeight: 600 }}
          >
            Devices
          </Button>
          <Button 
            color={location.pathname === '/plans' ? 'primary' : 'inherit'}
            onClick={() => navigate('/plans')}
            sx={{ fontWeight: 600 }}
          >
            Plans
          </Button>
          <IconButton color="inherit" onClick={() => navigate('/cart')}>
            <Badge badgeContent={items.length} color="error">
              <ShoppingCart />
            </Badge>
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;