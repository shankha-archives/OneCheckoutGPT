import React, { useState, useRef, useEffect, useContext } from 'react';
import { Box, TextField, IconButton, Paper, Button, Typography, 
         Grid, Card, CardMedia, CardContent, Chip, CircularProgress } from '@mui/material';
import { Search, Mic, MicOff, Close, Refresh, Send } from '@mui/icons-material';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { CartContext } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const SmartSearchBar = ({ devices, plans }) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const ref = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Handle clicks outside the search box to collapse it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);

  // Update query when speech recognition completes
  useEffect(() => {
    if (transcript && !listening) {
      setQuery(transcript);
      resetTranscript();
    }
  }, [transcript, listening, resetTranscript]);
  
  // Scroll to bottom of chat when chat history updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);
  
  // Focus input field after results appear
  useEffect(() => {
    if (expanded && inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [expanded, results, isLoading, info]);
  
  // Generate fallback recommendations based on user query
  const generateFallbackRecommendations = (userQuery) => {
    let deviceMatches = [];
    const lowerQuery = userQuery.toLowerCase();
    
    // Look for brand matches
    const brands = ['apple', 'samsung', 'google', 'xiaomi', 'oneplus', 'nothing', 'sony'];
    const matchedBrand = brands.find(brand => lowerQuery.includes(brand));
    
    if (matchedBrand) {
      deviceMatches = devices.filter(d => 
        d.brand.toLowerCase().includes(matchedBrand)
      );
    }
    
    // Look for feature matches
    const features = ['camera', 'battery', 'storage', '5g', 'waterproof', 'display'];
    const matchedFeature = features.find(feature => lowerQuery.includes(feature));
    
    if (matchedFeature && deviceMatches.length === 0) {
      deviceMatches = devices.filter(d => 
        d.features.some(f => f.toLowerCase().includes(matchedFeature))
      );
    }
    
    // If still no matches, return top-rated devices
    if (deviceMatches.length === 0) {
      // Return highest price devices as "premium options"
      deviceMatches = [...devices].sort((a, b) => b.price - a.price).slice(0, 3);
    }
    
    // Take top 3 matches
    deviceMatches = deviceMatches.slice(0, 3);
    
    // Match with appropriate plans
    return deviceMatches.map(device => {
      // Match premium devices with premium plans, etc.
      let matchedPlan;
      if (device.price > 1000) {
        matchedPlan = plans.find(p => p.type === 'Postpaid' && p.price > 50) || plans[0];
      } else if (device.price > 600) {
        matchedPlan = plans.find(p => p.type === 'Postpaid' && p.price > 30 && p.price <= 50) || plans[0];
      } else {
        matchedPlan = plans.find(p => p.type === 'Prepaid') || plans[0];
      }
      
      return {
        device,
        plan: matchedPlan,
        explanation: `${device.brand} ${device.name} with ${matchedPlan.name} plan based on your search for "${userQuery}"`
      };
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (query.trim()) {
      setIsLoading(true);
      setError(null);
      
      try {
        // Call backend chat API with session ID
        const response = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: query, 
            session_id: sessionId 
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("LLM response:", data); // Debug logging
        
        // Store or update session ID
        if (data.session_id) {
          setSessionId(data.session_id);
        }
        
        // Add message to chat history
        const newMessage = {
          type: 'user',
          content: query
        };
        
        const botResponse = {
          type: 'bot',
          content: data.response
        };
        
        setChatHistory(prev => [...prev, newMessage, botResponse]);
        
        // Clear the input field after sending
        setQuery('');
        
        // Always show results regardless of clarification needed
        // Check if we have structured recommendations from LLM
        if (data.devices && Array.isArray(data.devices) && data.devices.length > 0) {
          // Use the AI's device recommendations
          const recommendedResults = data.devices.map(rec => {
            // Find the full device details from our devices list
            const deviceMatch = devices.find(d => 
              d.id.toString() === rec.id.toString() || d.name === rec.name
            );
            
            // Find a matching plan if available
            const planRec = data.plans && data.plans.length > 0 ? data.plans[0] : null;
            const planMatch = planRec ? plans.find(p => 
              p.id.toString() === planRec.id.toString() || p.name === planRec.name
            ) : plans[0];
            
            return {
              device: deviceMatch || devices[0],
              plan: planMatch || plans[0],
              explanation: rec.reasoning || data.response || "Recommended based on your preferences"
            };
          });
          
          setResults(recommendedResults.slice(0, 3)); // Take up to 3 recommendations
        } else {
          // Generate fallback recommendations based on query keywords
          const fallbackResults = generateFallbackRecommendations(query);
          setResults(fallbackResults);
        }
        
        setInfo(null);
        setExpanded(true);
      } catch (err) {
        console.error("Error calling API:", err);
        setError("Failed to get recommendations. Please try again.");
        // Still show fallback recommendations on error
        const fallbackResults = generateFallbackRecommendations(query);
        setResults(fallbackResults);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVoiceToggle = (e) => {
    e.stopPropagation();
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
    }
  };

  const handleResetConversation = async () => {
    setIsLoading(true);
    try {
      // If we have a session ID, send reset to backend
      if (sessionId) {
        const response = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reset: true,
            session_id: sessionId 
          })
        });
        
        if (!response.ok) {
          throw new Error("Failed to reset conversation");
        }
      }
      
      // Clear all state and reset UI to initial state
      setChatHistory([]);
      setResults([]);
      setSessionId(null);
      setQuery('');
      setInfo(null);
      setError(null);
      setExpanded(false); // This will bring back the original search box
    } catch (err) {
      console.error("Error resetting conversation:", err);
      setError("Failed to reset conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddToCart = (device, plan) => {
    addToCart({
      id: `${device.id}-${plan.id}`,
      device,
      plan,
      price: parseFloat(device.price) + parseFloat(plan.price),
      quantity: 1
    });
    navigate('/cart');
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      mt: 4,
      mb: 4,
      width: '100%',
    }}>
      <Box
        ref={ref}
        sx={{
          width: expanded ? 800 : 600, // Increased width for better visibility
          transition: 'width 0.3s',
          mx: 'auto',
          position: 'relative',
        }}
      >
        {/* Initial Search Bar - only shown when not expanded */}
        {!expanded && (
          <Paper
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 4,
              py: 3,
              borderRadius: 4,
              boxShadow: 4,
              bgcolor: 'background.paper',
              width: '100%',
              minHeight: 80,
            }}
            onClick={() => setExpanded(true)}
          >
            <Search sx={{ color: 'primary.main', mr: 2, fontSize: 32 }} />
            <TextField
              variant="standard"
              placeholder="Ask anything, e.g. 'Show me Android phones under $500 with 5G'"
              value={query}
              onChange={e => setQuery(e.target.value)}
              InputProps={{
                disableUnderline: true,
                style: { fontSize: 24, width: 400 }
              }}
              sx={{ flex: 1 }}
              onFocus={() => setExpanded(true)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              {browserSupportsSpeechRecognition && (
                <IconButton
                  onClick={handleVoiceToggle}
                  sx={{
                    color: listening ? 'primary.main' : 'grey.600',
                    mr: 1,
                    zIndex: 2,
                  }}
                  tabIndex={-1}
                >
                  {listening ? <Mic /> : <MicOff />}
                </IconButton>
              )}
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isLoading}
              sx={{ ml: 3, px: 5, py: 2, fontSize: 20, fontWeight: 600, borderRadius: 2 }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
            </Button>
          </Paper>
        )}
        
        {/* Expanded Chat Interface */}
        {expanded && (
          <Box>
            {/* Chat Header with Reset Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Shopping Assistant</Typography>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Refresh />}
                onClick={handleResetConversation}
                disabled={isLoading}
              >
                Start Over
              </Button>
            </Box>
            
            {/* Chat History */}
            {chatHistory.length > 0 && (
              <Paper 
                sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  maxHeight: 300, 
                  overflowY: 'auto',
                  mb: 2,
                  bgcolor: '#f9f9f9'
                }}
              >
                {chatHistory.map((msg, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      mb: 1.5,
                      display: 'flex',
                      justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <Paper 
                      sx={{ 
                        p: 1.5, 
                        px: 2,
                        borderRadius: 2, 
                        maxWidth: '75%',
                        bgcolor: msg.type === 'user' ? 'primary.light' : 'grey.100',
                        color: msg.type === 'user' ? 'white' : 'text.primary'
                      }}
                    >
                      <Typography variant="body1">{msg.content}</Typography>
                    </Paper>
                  </Box>
                ))}
                <div ref={chatEndRef} />
              </Paper>
            )}

            {/* Error message */}
            {error && (
              <Paper sx={{ mb: 2, p: 2, bgcolor: '#ffebee', color: '#c62828', borderRadius: 2 }}>
                <Typography>{error}</Typography>
              </Paper>
            )}

            {/* Info message */}
            {info && (
              <Paper sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', color: '#0d47a1', borderRadius: 2 }}>
                <Typography>{info}</Typography>
              </Paper>
            )}

            {/* Product Recommendations */}
            {results.length > 0 && (
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  boxShadow: 4,
                  width: '100%',
                  maxHeight: 500,
                  overflowY: 'auto',
                  mb: 2
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
                  AI Suggestions
                </Typography>
                <Grid container spacing={3}>
                  {results.map((result, idx) => (
                    <Grid item xs={12} md={4} key={idx}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardMedia
                          component="img"
                          height="140"
                          image={result.device.image}
                          alt={result.device.name}
                          sx={{ objectFit: 'contain', bgcolor: '#f8f8f8', p: 1 }}
                          onError={e => { e.target.onerror = null; e.target.src = "/images/no-image.png"; }}
                        />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {result.device.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            by {result.device.brand} • €{result.device.price}
                          </Typography>
                          <Box sx={{ mb: 1 }}>
                            {result.device.features.slice(0, 3).map((feature, i) => (
                              <Chip key={i} label={feature} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                          </Box>
                          <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 600, color: 'primary.main' }}>
                            Plan: {result.plan.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            €{result.plan.price}/mo • {result.plan.data}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 1.5, fontStyle: 'italic' }}>
                            {result.explanation}
                          </Typography>
                          
                          <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              Bundle: €{parseFloat(result.device.price) + parseFloat(result.plan.price) * 24}/24mo
                            </Typography>
                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              sx={{ fontWeight: 600, borderRadius: 2 }}
                              onClick={() => handleAddToCart(result.device, result.plan)}
                            >
                              Add Bundle to Cart
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
            
            {/* Bottom chat input */}
            <Paper 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2,
                borderRadius: 4,
                boxShadow: 2
              }}
            >
              <TextField
                variant="outlined"
                placeholder="Type your message..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                fullWidth
                inputRef={inputRef}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
                sx={{ mr: 1 }}
              />
              {browserSupportsSpeechRecognition && (
                <IconButton
                  onClick={handleVoiceToggle}
                  color={listening ? "primary" : "default"}
                  sx={{ mr: 1 }}
                >
                  {listening ? <Mic /> : <MicOff />}
                </IconButton>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isLoading || !query.trim()}
                endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Send />}
                sx={{ px: 3, py: 1.2 }}
              >
                Send
              </Button>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SmartSearchBar;