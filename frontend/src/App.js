import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCatalog from './pages/ProductCatalog';
import Checkout from './pages/Checkout';
import CartProvider from './context/CartContext';
import ChatBot from './components/ChatBot';

const theme = createTheme({
  palette: {
    primary: { main: '#E20074' },
    secondary: { main: '#00D2FF' },
    background: { default: '#F8F9FA', paper: '#FFFFFF' },
    text: { primary: '#1A1A1A', secondary: '#666666' },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 600, fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 8 },
});

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CartProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ flexGrow: 1, pt: 2 }}>
              <Routes>
                <Route path="/" element={<ProductCatalog />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
            </Box>
            <Footer />
            <ChatBot open={isChatOpen} onClose={() => setIsChatOpen(false)} />
            <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: '#E20074',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(226, 0, 116, 0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                💬
              </button>
            </Box>
          </Box>
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;
