import React, { useContext } from 'react';
import { Container, Typography, Box, Button, List, ListItem, ListItemText } from '@mui/material';
import { CartContext } from '../context/CartContext';

const Checkout = () => {
  const { cartItems, getTotalPrice, clearCart } = useContext(CartContext);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
        Checkout
      </Typography>
      <List>
        {cartItems.map((item) => (
          <ListItem key={item.id}>
            <ListItemText primary={item.name || item.brand} secondary={`Quantity: ${item.quantity} | Price: €${item.price}`} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h6">Total: €{getTotalPrice()}</Typography>
      </Box>
      <Button variant="contained" color="primary" fullWidth sx={{ py: 1.5, fontWeight: 600 }} onClick={clearCart}>
        Confirm & Pay
      </Button>
    </Container>
  );
};

export default Checkout;