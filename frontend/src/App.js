import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import ProductCatalog from './pages/ProductCatalog';
import Cart from './pages/Cart';
import PlansPage from './pages/PlansPage';
import { CartProvider } from './context/CartContext';
import VoiceAssistant from './components/VoiceAssistant';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#e91e63',
    },
    secondary: {
      main: '#2196f3',
    },
    background: {
      default: '#fafafa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CartProvider>
        <Router>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Routes>
              <Route path="/" element={<ProductCatalog />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/plans" element={<PlansPage />} />
            </Routes>
            
            {/* Voice Assistant - Available on all pages */}
            <VoiceAssistant />
          </Box>
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;