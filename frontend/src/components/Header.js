import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Badge, IconButton, Box, Button } from '@mui/material';
import { ShoppingCart, Phone } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const Header = () => {
  const { items } = useContext(CartContext);
  const navigate = useNavigate();
  
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
          onClick={() => navigate('/')}
        >
          ShoppingGPT
        </Typography>
        <IconButton color="inherit" onClick={() => navigate('/cart')}>
          <Badge badgeContent={items.length} color="error">
            <ShoppingCart />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;