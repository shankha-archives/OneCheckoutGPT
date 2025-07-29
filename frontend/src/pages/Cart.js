import React, { useContext, useState } from 'react';
import { 
  Box, Container, Typography, Button, Divider, Grid, Card, CardContent, 
  CardMedia, IconButton, TextField, Paper, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress
} from '@mui/material';
import { Delete, Add, Remove, ArrowForward, ArrowBack } from '@mui/icons-material';
import { CartContext } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal } = useContext(CartContext);
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const steps = ['Shopping Cart', 'Shipping', 'Payment', 'Confirmation'];
  
  const handleNext = () => {
    if (activeStep === 0 && items.length === 0) {
      return; // Don't proceed if cart is empty
    }
    
    if (activeStep === 1) {
      setLoginOpen(true);
      return;
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleLogin = () => {
    setIsLoading(true);
    setLoginError('');
    
    // Simulate authentication delay
    setTimeout(() => {
      if (email && password) {
        setLoginOpen(false);
        setActiveStep(2);
      } else {
        setLoginError('Please enter both email and password');
      }
      setIsLoading(false);
    }, 1500);
  };
  
  const handlePlaceOrder = () => {
    setIsLoading(true);
    
    // Simulate order processing
    setTimeout(() => {
      setIsLoading(false);
      setOrderSuccess(true);
      clearCart();
      setActiveStep(3);
    }, 2000);
  };
  
  const cartContent = (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Your Cart {items.length > 0 ? `(${items.length} items)` : ''}
      </Typography>
      
      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
            Your cart is empty
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
          >
            Continue Shopping
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {items.map((item) => (
                <Card key={item.id} sx={{ mb: 2, display: 'flex', position: 'relative' }}>
                  <CardMedia
                    component="img"
                    sx={{ width: 140, objectFit: 'contain', p: 2 }}
                    image={item.device.image || "/images/no-image.png"}
                    alt={item.device.name}
                  />
                  <CardContent sx={{ flex: '1 0 auto', py: 2 }}>
                    <Typography variant="h6">{item.device.name}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {item.device.brand}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Plan: {item.plan.name} - {item.plan.data}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <TextField
                        size="small"
                        value={item.quantity}
                        InputProps={{ 
                          readOnly: true,
                          sx: { 
                            width: 40, 
                            textAlign: 'center',
                            '& input': { textAlign: 'center' }
                          }
                        }}
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2, alignItems: 'flex-end' }}>
                    <IconButton 
                      size="small" 
                      onClick={() => removeFromCart(item.id)}
                      sx={{ alignSelf: 'flex-end' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 2 }}>
                      €{(item.price * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Order Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Subtotal</Typography>
                  <Typography variant="body1">€{getCartTotal().toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Shipping</Typography>
                  <Typography variant="body1">€0.00</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Tax</Typography>
                  <Typography variant="body1">€{(getCartTotal() * 0.19).toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    €{(getCartTotal() * 1.19).toFixed(2)}
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  onClick={handleNext}
                >
                  Proceed to Checkout
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  size="large"
                  onClick={() => navigate('/')}
                  sx={{ mt: 2 }}
                >
                  Continue Shopping
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );

  const shippingContent = (
    <Box sx={{ maxWidth: 600, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Shipping Address
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="firstName"
            name="firstName"
            label="First name"
            fullWidth
            autoComplete="given-name"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="lastName"
            name="lastName"
            label="Last name"
            fullWidth
            autoComplete="family-name"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            id="address1"
            name="address1"
            label="Address line 1"
            fullWidth
            autoComplete="shipping address-line1"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            id="address2"
            name="address2"
            label="Address line 2"
            fullWidth
            autoComplete="shipping address-line2"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="city"
            name="city"
            label="City"
            fullWidth
            autoComplete="shipping address-level2"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="postalCode"
            name="postalCode"
            label="Postal code"
            fullWidth
            autoComplete="shipping postal-code"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            id="country"
            name="country"
            label="Country"
            fullWidth
            autoComplete="shipping country"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            id="phone"
            name="phone"
            label="Phone Number"
            fullWidth
            autoComplete="tel"
          />
        </Grid>
      </Grid>
    </Box>
  );
  
  const paymentContent = (
    <Box sx={{ maxWidth: 600, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Payment Method
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            required
            id="cardName"
            label="Name on card"
            fullWidth
            autoComplete="cc-name"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            id="cardNumber"
            label="Card number"
            fullWidth
            autoComplete="cc-number"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            id="expDate"
            label="Expiry date"
            fullWidth
            autoComplete="cc-exp"
            placeholder="MM/YY"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            id="cvv"
            label="CVV"
            helperText="Last three digits on signature strip"
            fullWidth
            autoComplete="cc-csc"
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            onClick={handlePlaceOrder}
            disabled={isLoading}
            sx={{ mt: 2, py: 1.5 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Place Order'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
  
  const confirmationContent = (
    <Box sx={{ textAlign: 'center', my: 4, py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Thank you for your order!
        </Typography>
        <Typography variant="subtitle1">
          Your order number is #2001539. We have emailed your order
          confirmation, and will send you an update when your order has
          shipped.
        </Typography>
      </Box>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => navigate('/')}
      >
        Continue Shopping
      </Button>
    </Box>
  );

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === 0 && cartContent}
        {activeStep === 1 && shippingContent}
        {activeStep === 2 && paymentContent}
        {activeStep === 3 && confirmationContent}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          {activeStep > 0 && activeStep < 3 && (
            <Button onClick={handleBack} startIcon={<ArrowBack />}>
              Back
            </Button>
          )}
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep < 3 && activeStep !== 2 && activeStep !== 0 && (
            <Button 
              variant="contained" 
              onClick={handleNext} 
              endIcon={<ArrowForward />}
              disabled={activeStep === 0 && items.length === 0}
            >
              {activeStep === steps.length - 2 ? 'Place order' : 'Next'}
            </Button>
          )}
        </Box>
        
        {/* Login Dialog */}
        <Dialog open={loginOpen} onClose={() => setLoginOpen(false)}>
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please sign in to your account to continue with checkout.
            </DialogContentText>
            {loginError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {loginError}
              </Typography>
            )}
            <TextField
              autoFocus
              margin="dense"
              id="email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mt: 2 }}
            />
            <TextField
              margin="dense"
              id="password"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setLoginOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLogin} 
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default Cart;