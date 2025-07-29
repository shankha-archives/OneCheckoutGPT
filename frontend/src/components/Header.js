import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Button, Badge, IconButton, Box } from '@mui/material';
import { ShoppingCart } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const Header = () => {
  const navigate = useNavigate();
  const { cartItems } = useContext(CartContext);
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <AppBar position="sticky" elevation={0} sx={{ backgroundColor: 'white', borderBottom: '1px solid #E0E0E0' }}>
      <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '-0.5px' }}>
            OneCheckout
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button sx={{ color: 'text.primary', fontWeight: 500 }} onClick={() => navigate('/')}>
            Smartphones
          </Button>
          <Button sx={{ color: 'text.primary', fontWeight: 500 }} onClick={() => navigate('/')}>
            Plans
          </Button>
          <Button sx={{ color: 'text.primary', fontWeight: 500 }} onClick={() => navigate('/')}>
            Bundles
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton sx={{ color: 'text.primary' }} onClick={() => navigate('/checkout')}>
            <Badge badgeContent={cartItemCount} color="primary">
              <ShoppingCart />
            </Badge>
          </IconButton>
          <Button variant="contained" sx={{ ml: 2, px: 3, py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Login
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;