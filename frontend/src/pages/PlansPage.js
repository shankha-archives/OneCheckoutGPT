import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, Typography, Grid, Card, CardContent, Button, Box, 
  Chip, Divider, List, ListItem, ListItemIcon, ListItemText,
  Paper, Tab, Tabs
} from '@mui/material';
import { Check, Star, Wifi, Language, Phone } from '@mui/icons-material';
import Header from '../components/Header';
import { CartContext } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const PlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansResponse, devicesResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/plans`),
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/devices`)
        ]);

        if (plansResponse.ok && devicesResponse.ok) {
          const plansData = await plansResponse.json();
          const devicesData = await devicesResponse.json();
          setPlans(plansData);
          setDevices(devicesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const filterPlansByType = (type) => {
    return plans.filter(plan => plan.type.toLowerCase() === type.toLowerCase());
  };

  const handleSelectPlan = (plan) => {
    // For plans page, add most popular device with selected plan
    const popularDevice = devices.find(d => d.name.includes('iPhone 15')) || devices[0];
    
    if (popularDevice) {
      addToCart({
        id: `${popularDevice.id}-${plan.id}`,
        device: popularDevice,
        plan: plan,
        price: parseFloat(popularDevice.price) + parseFloat(plan.price),
        quantity: 1
      });
      navigate('/cart');
    }
  };

  const PlanCard = ({ plan, isRecommended = false }) => (
    <Card 
      sx={{ 
        height: '100%',
        position: 'relative',
        border: isRecommended ? 2 : 1,
        borderColor: isRecommended ? 'secondary.main' : 'divider',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {isRecommended && (
        <Box
          sx={{
            position: 'absolute',
            top: -1,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'secondary.main',
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: '0 0 8px 8px',
            zIndex: 1
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            <Star sx={{ fontSize: 14, mr: 0.5 }} />
            MOST POPULAR
          </Typography>
        </Box>
      )}
      
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {plan.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {plan.type}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary' }}>
              €{plan.price}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              per month
            </Typography>
          </Box>
          
          <Chip 
            label={plan.data} 
            color="primary" 
            sx={{ 
              fontWeight: 600,
              fontSize: '1rem',
              height: 32
            }} 
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            What's included:
          </Typography>
          <List dense>
            {plan.features.map((feature, index) => (
              <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Check color="success" sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText 
                  primary={feature}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Button
          variant={isRecommended ? "contained" : "outlined"}
          color={isRecommended ? "secondary" : "primary"}
          fullWidth
          size="large"
          onClick={() => handleSelectPlan(plan)}
          sx={{ 
            mt: 2,
            py: 1.5,
            fontWeight: 600,
            borderRadius: 2
          }}
        >
          Choose Plan
        </Button>
      </CardContent>
    </Card>
  );

  const tabLabels = ['All Plans', 'Postpaid', 'Prepaid', 'Youth', 'Business'];
  const tabTypes = ['all', 'postpaid', 'prepaid', 'youth', 'business'];

  const getPlansForTab = () => {
    if (selectedTab === 0) return plans;
    return filterPlansByType(tabTypes[selectedTab]);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading plans...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
            Choose Your Perfect Plan
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            From basic connectivity to unlimited everything - find the plan that fits your lifestyle and budget
          </Typography>
        </Box>

        {/* Plan Categories */}
        <Paper sx={{ mb: 4 }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            {tabLabels.map((label, index) => (
              <Tab key={index} label={label} sx={{ fontWeight: 600 }} />
            ))}
          </Tabs>
        </Paper>

        {/* Plans Grid */}
        <Grid container spacing={3}>
          {getPlansForTab().map((plan, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={plan.id}>
              <PlanCard 
                plan={plan} 
                isRecommended={plan.name === 'MagentaMobil M'} 
              />
            </Grid>
          ))}
        </Grid>

        {/* Additional Info */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Why Choose Our Plans?
          </Typography>
          <Grid container spacing={4} sx={{ maxWidth: 800, mx: 'auto' }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Wifi color="primary" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  5G Network
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lightning-fast speeds across Germany
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Language color="primary" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  EU Roaming
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use your plan across Europe at no extra cost
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Phone color="primary" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  24/7 Support
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get help whenever you need it
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Voice Assistant Suggestion */}
        <Paper 
          sx={{ 
            mt: 6, 
            p: 4, 
            textAlign: 'center',
            bgcolor: 'primary.main',
            color: 'white'
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            Not sure which plan is right for you?
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Try our Voice Assistant! It will ask about your usage and recommend the perfect plan.
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Look for the microphone button in the bottom right corner
          </Typography>
        </Paper>
      </Container>
    </>
  );
};

export default PlansPage;