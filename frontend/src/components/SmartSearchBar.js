import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { Box, TextField, IconButton, Paper, Button, Typography, 
         Card, CardMedia, CardContent, CircularProgress, Fab, Tooltip } from '@mui/material';
import { Search, Mic, MicOff, Close, Send, VolumeUp, VolumeOff, Refresh } from '@mui/icons-material';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { CartContext } from '../context/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';

const SmartSearchBar = ({ devices, plans }) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [voiceAssistantActive, setVoiceAssistantActive] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [isNewSession, setIsNewSession] = useState(true);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Refs
  const synthesisRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const isUserInteractingRef = useRef(false);
  const transcriptTimeoutRef = useRef(null);
  const ref = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const processingRef = useRef(false);
  
  const { addToCart, items } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    transcript, 
    listening, 
    resetTranscript, 
    browserSupportsSpeechRecognition,
    interimTranscript
  } = useSpeechRecognition({
    continuous: true
  });

  const browserSupportsSpeechSynthesis = 'speechSynthesis' in window;

  // Initialize
  useEffect(() => {
    if (browserSupportsSpeechSynthesis) {
      synthesisRef.current = window.speechSynthesis;
    }
    
    // Load saved state
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedSessionId) setSessionId(savedSessionId);
    
    const savedChatHistory = localStorage.getItem('chatHistory');
    if (savedChatHistory) {
      try {
        setChatHistory(JSON.parse(savedChatHistory));
        setIsNewSession(false);
      } catch (e) {
        localStorage.removeItem('chatHistory');
      }
    }
    
    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
    };
  }, []);

  // Save chat history
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  useEffect(() => {
    if (sessionId) localStorage.setItem('sessionId', sessionId);
  }, [sessionId]);

  // FIXED: Robust voice transcript handling
  useEffect(() => {
    if (!voiceAssistantActive) return;

    // Handle interim transcript for real-time display
    if (interimTranscript) {
      setVoiceTranscript(interimTranscript);
    }

    // Process final transcript
    if (transcript && transcript !== lastTranscriptRef.current && !processingRef.current) {
      setVoiceTranscript(transcript);
      lastTranscriptRef.current = transcript;

      // Clear existing timeout
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }

      // FIXED: More aggressive timeout and better conditions
      transcriptTimeoutRef.current = setTimeout(() => {
        if (transcript.trim() && 
            !voiceSpeaking && 
            !isUserInteractingRef.current && 
            !isLoading &&
            !processingRef.current) {
          
          console.log('Processing voice input:', transcript);
          processingRef.current = true;
          
          // Process the voice input
          processVoiceInput(transcript).finally(() => {
            processingRef.current = false;
            resetTranscript();
            setVoiceTranscript('');
            lastTranscriptRef.current = '';
          });
        }
      }, 1500); // Slightly longer for better accuracy

      return () => {
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current);
        }
      };
    }
  }, [transcript, interimTranscript, voiceAssistantActive, voiceSpeaking, isLoading]);

  // FIXED: More robust continuous listening
  useEffect(() => {
    if (!voiceAssistantActive) return;
    
    // Start listening if conditions are met
    if (!listening && 
        !voiceSpeaking && 
        !isUserInteractingRef.current && 
        !processingRef.current &&
        !isLoading) {
      
      const timer = setTimeout(() => {
        if (voiceAssistantActive && 
            !isUserInteractingRef.current && 
            !processingRef.current &&
            !isLoading) {
          try {
            console.log('Starting speech recognition...');
            SpeechRecognition.startListening({ continuous: true });
          } catch (error) {
            console.error('Error starting speech recognition:', error);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [voiceAssistantActive, listening, voiceSpeaking, isLoading]);

  // FIXED: Auto-scroll within chat container only (no page scroll)
  useEffect(() => {
    if (chatEndRef.current && chatHistory.length > 0) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      });
    }
  }, [chatHistory]);

  // Prevent page scroll when chat is expanded
  useEffect(() => {
    if (expanded || voiceAssistantActive) {
      // Disable page scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Re-enable page scroll
        document.body.style.overflow = 'unset';
      };
    }
  }, [expanded, voiceAssistantActive]);

  // FIXED: Enhanced input handlers
  const handleInputFocus = useCallback(() => {
    console.log('Text input focused - stopping voice agent');
    isUserInteractingRef.current = true;
    
    // Immediately stop all voice activities
    if (synthesisRef.current?.speaking) {
      synthesisRef.current.cancel();
      setVoiceSpeaking(false);
    }
    
    if (listening) {
      SpeechRecognition.stopListening();
    }
    
    // Clear voice-related states
    setVoiceTranscript('');
    resetTranscript();
    lastTranscriptRef.current = '';
    processingRef.current = false;
    
    // Clear timeouts
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
    }
    
    // Reset interaction flag after delay
    setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 2000);
  }, [listening]);

  const handleInputChange = useCallback((e) => {
    setQuery(e.target.value);
    isUserInteractingRef.current = true;
    setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 1500);
  }, []);

  // ENHANCED: Speech function with better interruption handling
  const speak = useCallback((text, priority = 'normal') => {
    if (!browserSupportsSpeechSynthesis || !text?.trim()) return;
    
    // Don't speak if user is typing
    if (isUserInteractingRef.current && priority !== 'high') return;
    
    // Stop current speech if high priority
    if (priority === 'high' && synthesisRef.current?.speaking) {
      synthesisRef.current.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice selection
    const voices = synthesisRef.current?.getVoices() || [];
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Female') || voice.name.includes('Samantha'))
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    setVoiceSpeaking(true);
    currentUtteranceRef.current = utterance;
    
    utterance.onstart = () => {
      setVoiceSpeaking(true);
      // IMPORTANT: Continue listening while speaking for interruption detection
      if (voiceAssistantActive && !listening && !isUserInteractingRef.current) {
        setTimeout(() => {
          if (voiceAssistantActive && !isUserInteractingRef.current) {
            try {
              SpeechRecognition.startListening({ continuous: true });
            } catch (error) {
              console.error('Error starting listening during speech:', error);
            }
          }
        }, 200);
      }
    };
    
    utterance.onend = () => {
      setVoiceSpeaking(false);
      currentUtteranceRef.current = null;
      
      // Resume listening after speech ends
      if (voiceAssistantActive && !isUserInteractingRef.current && !processingRef.current) {
        setTimeout(() => {
          if (voiceAssistantActive && !isUserInteractingRef.current && !processingRef.current) {
            try {
              SpeechRecognition.startListening({ continuous: true });
            } catch (error) {
              console.error('Error resuming listening after speech:', error);
            }
          }
        }, 500);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setVoiceSpeaking(false);
      currentUtteranceRef.current = null;
      
      // Resume listening on error
      if (voiceAssistantActive && !isUserInteractingRef.current) {
        setTimeout(() => {
          if (voiceAssistantActive && !isUserInteractingRef.current) {
            try {
              SpeechRecognition.startListening({ continuous: true });
            } catch (error) {
              console.error('Error resuming listening after error:', error);
            }
          }
        }, 500);
      }
    };
    
    synthesisRef.current?.speak(utterance);
  }, [browserSupportsSpeechSynthesis, voiceAssistantActive, listening]);

  // ENHANCED: Process voice input
  const processVoiceInput = useCallback(async (voiceInput) => {
    if (!voiceInput.trim() || isLoading || processingRef.current) return;
    
    console.log('Starting to process voice input:', voiceInput);
    setIsLoading(true);
    
    try {
      // Add user message to chat (from voice)
      const userMessage = {
        type: 'user',
        content: voiceInput,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        isVoice: true
      };
      
      setChatHistory(prev => [...prev, userMessage]);
      
      // Detect user intent
      const userIntent = detectUserIntent(voiceInput);
      
      // Handle special intents
      if (['exit', 'help'].includes(userIntent.type)) {
        const botResponse = {
          type: 'bot',
          content: userIntent.response,
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        
        setChatHistory(prev => [...prev, botResponse]);
        speak(userIntent.response, 'high');
        
        if (userIntent.exitVoiceMode) {
          setTimeout(() => {
            setVoiceAssistantActive(false);
          }, 2000);
        }
        
        return;
      }
      
      // Handle cart navigation
      if (userIntent.type === 'shopping' && userIntent.subtype === 'view_cart') {
        const botResponse = {
          type: 'bot',
          content: userIntent.response,
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        setChatHistory(prev => [...prev, botResponse]);
        speak(userIntent.response);
        setTimeout(() => navigate('/cart'), 1000);
        return;
      }
      
      // API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: voiceInput, 
          session_id: sessionId 
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      if (data.session_id) setSessionId(data.session_id);
      
      const botResponse = data.response || getResponse('search');
      
      const botTextResponse = {
        type: 'bot',
        content: botResponse,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      let updatedHistory = [botTextResponse];
      
      // Handle products
      if (data.devices && Array.isArray(data.devices) && data.devices.length > 0) {
        const productsToShow = data.devices.slice(0, 2).map(rec => {
          const deviceMatch = devices.find(d => 
            d.id?.toString() === rec.id?.toString() || d.name === rec.name
          ) || devices[0];
          
          const planMatch = plans[0];
          
          return { device: deviceMatch, plan: planMatch };
        });
        
        const productsResponse = {
          type: 'products',
          products: productsToShow,
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        updatedHistory.push(productsResponse);
      }
      
      setChatHistory(prev => [...prev, ...updatedHistory]);
      
      // Create speech version
      let speechText = botResponse;
      if (data.devices && data.devices.length > 0) {
        const firstDevice = data.devices[0];
        const deviceMatch = devices.find(d => 
          d.id?.toString() === firstDevice.id?.toString() || d.name === firstDevice.name
        ) || devices[0];
        
        speechText += ` I found the ${deviceMatch.name} for €${deviceMatch.price}. Should I add it to your cart?`;
      }
      
      speak(speechText);
      setExpanded(true);
      
    } catch (err) {
      console.error("API Error:", err);
      
      const errorResponse = {
        type: 'bot',
        content: getResponse('error'),
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setChatHistory(prev => [...prev, errorResponse]);
      speak(getResponse('error'));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, devices, plans, navigate, speak]);

  // Response generator
  const getResponse = useCallback((type) => {
    const responses = {
      greeting: [
        "Hi! What device are you looking for?",
        "Hey! Ready to find your perfect phone?",
        "Hello! Let's find you something amazing!"
      ],
      search: [
        "Great choice! Here are some options.",
        "Perfect! Here's what I found.",
        "Nice! Check these out."
      ],
      error: [
        "Oops! Let me try again.",
        "Technical hiccup! Still here to help.",
        "Something went wrong. Let's retry!"
      ],
      addToCart: [
        "Added to cart! Great choice!",
        "Done! It's in your cart.",
        "Perfect! Added successfully."
      ]
    };
    
    const categoryResponses = responses[type] || responses.search;
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  }, []);

  // User intent detection
  const detectUserIntent = useCallback((userQuery) => {
    const lowerQuery = userQuery.toLowerCase();
    
    if (['exit', 'bye', 'goodbye', 'stop'].some(term => lowerQuery.includes(term))) {
      return { type: 'exit', response: 'Goodbye! Thanks for shopping!', exitVoiceMode: true };
    }
    
    if (['help', 'what can you do'].some(term => lowerQuery.includes(term))) {
      return { type: 'help', response: "I help you find phones and plans! Try asking for specific brands or features." };
    }
    
    if (lowerQuery.includes('cart')) {
      return { type: 'shopping', subtype: 'view_cart', response: "Taking you to your cart!" };
    }
    
    return { type: 'conversational' };
  }, []);

  // Text submit handler
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;
    
    const currentQuery = query.trim();
    setQuery('');
    
    await processTextInput(currentQuery);
  }, [query, isLoading]);

  // Process text input
  const processTextInput = useCallback(async (textInput) => {
    setIsLoading(true);
    
    try {
      const userMessage = {
        type: 'user',
        content: textInput,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        isVoice: false
      };
      
      setChatHistory(prev => [...prev, userMessage]);
      
      // API call
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textInput, 
          session_id: sessionId 
        })
      });
      
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      if (data.session_id) setSessionId(data.session_id);
      
      const botResponse = data.response || getResponse('search');
      
      const botTextResponse = {
        type: 'bot',
        content: botResponse,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setChatHistory(prev => [...prev, botTextResponse]);
      
      // Handle products
      if (data.devices && Array.isArray(data.devices) && data.devices.length > 0) {
        const productsToShow = data.devices.slice(0, 2).map(rec => {
          const deviceMatch = devices.find(d => 
            d.id?.toString() === rec.id?.toString() || d.name === rec.name
          ) || devices[0];
          
          return { device: deviceMatch, plan: plans[0] };
        });
        
        const productsResponse = {
          type: 'products',
          products: productsToShow,
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        setChatHistory(prev => [...prev, productsResponse]);
      }
      
      setExpanded(true);
      
    } catch (err) {
      console.error("API Error:", err);
      const errorResponse = {
        type: 'bot',
        content: getResponse('error'),
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      setChatHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, devices, plans, getResponse]);

  // FIXED: Voice toggle with better state management
  const handleVoiceToggle = useCallback((e) => {
    e?.stopPropagation();
    
    if (voiceAssistantActive) {
      // Turn off voice assistant
      console.log('Turning off voice assistant');
      setVoiceAssistantActive(false);
      setVoiceTranscript('');
      
      // Stop all voice activities
      if (synthesisRef.current?.speaking) {
        synthesisRef.current.cancel();
        setVoiceSpeaking(false);
      }
      
      if (listening) {
        SpeechRecognition.stopListening();
      }
      
      // Reset all refs and states
      resetTranscript();
      lastTranscriptRef.current = '';
      processingRef.current = false;
      
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
      
    } else {
      // Turn on voice assistant
      console.log('Turning on voice assistant');
      setVoiceAssistantActive(true);
      setExpanded(true);
      
      // Start listening after a short delay
      setTimeout(() => {
        if (!isUserInteractingRef.current) {
          try {
            SpeechRecognition.startListening({ continuous: true });
          } catch (error) {
            console.error('Error starting speech recognition:', error);
          }
        }
        
        // Greet only on new session
        if (isNewSession && chatHistory.length === 0) {
          speak(getResponse('greeting'), 'high');
          setIsNewSession(false);
        }
      }, 500);
    }
  }, [voiceAssistantActive, listening, isNewSession, chatHistory.length, speak, getResponse]);

  // FIXED: Reset conversation function
  const handleResetConversation = useCallback(async () => {
    console.log('Resetting conversation');
    setIsLoading(true);
    
    try {
      // Stop all voice activities
      if (synthesisRef.current?.speaking) {
        synthesisRef.current.cancel();
        setVoiceSpeaking(false);
      }
      
      if (listening) {
        SpeechRecognition.stopListening();
      }
      
      // Clear all states
      setChatHistory([]);
      setSessionId(null);
      setQuery('');
      setVoiceTranscript('');
      setIsNewSession(true);
      
      // Reset refs
      lastTranscriptRef.current = '';
      processingRef.current = false;
      
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
      
      // Clear localStorage
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('sessionId');
      
      // Reset backend session if exists
      if (sessionId) {
        try {
          await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              reset: true,
              session_id: sessionId 
            })
          });
        } catch (error) {
          console.error('Error resetting backend session:', error);
        }
      }
      
      // Restart voice if it was active
      if (voiceAssistantActive) {
        setTimeout(() => {
          try {
            SpeechRecognition.startListening({ continuous: true });
            speak("Fresh start! What can I help you find?", 'high');
          } catch (error) {
            console.error('Error restarting voice after reset:', error);
          }
        }, 1000);
      } else {
        setExpanded(false);
      }
      
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, voiceAssistantActive, listening, speak]);

  // Add to cart handler
  const handleAddToCart = useCallback((device, plan) => {
    addToCart({
      id: `${device.id}-${plan.id}`,
      device,
      plan,
      price: parseFloat(device.price) + parseFloat(plan.price),
      quantity: 1
    });
    
    const message = getResponse('addToCart');
    const confirmationMessage = {
      type: 'bot',
      content: message,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setChatHistory(prev => [...prev, confirmationMessage]);
    
    if (voiceAssistantActive) {
      speak(message);
    } else {
      navigate('/cart');
    }
  }, [addToCart, getResponse, voiceAssistantActive, speak, navigate]);

  // Product card renderer
  const renderProductCard = useCallback((product, index) => {
    const { device, plan } = product;
    return (
      <Card 
        key={index} 
        sx={{ 
          mb: 1, 
          borderRadius: 2, 
          display: 'flex', 
          flexDirection: 'row',
          height: 180,
        }}
      >
        <CardMedia
          component="img"
          sx={{ 
            width: 140, 
            objectFit: 'contain', 
            bgcolor: 'white',
            p: 1,
          }}
          image={device?.image || "/images/no-image.png"}
          alt={device?.name}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'space-between' }}>
          <CardContent sx={{ flex: '1 0 auto', py: 1, px: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {device?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {device?.brand}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
              €{device?.price}
            </Typography>
          </CardContent>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            px: 2, 
            pb: 1,
          }}>
            <Button 
              variant="contained" 
              color="primary"
              size="small"
              onClick={() => handleAddToCart(device, plan)}
              sx={{ borderRadius: 4, px: 2 }}
            >
              Add to Cart
            </Button>
          </Box>
        </Box>
      </Card>
    );
  }, [handleAddToCart]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      mt: 4,
      mb: 4,
      width: '100%',
      position: 'relative'
    }}>
      {/* Floating voice button */}
      {voiceAssistantActive && (
        <Fab
          color={voiceSpeaking ? "secondary" : "primary"}
          size="medium"
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            animation: listening && !voiceSpeaking ? 'pulse 2s infinite' : 'none'
          }}
          onClick={handleVoiceToggle}
        >
          {voiceSpeaking ? <VolumeUp /> : <Mic />}
        </Fab>
      )}
      
      <Box
        ref={ref}
        sx={{
          width: expanded ? 800 : 600,
          transition: 'width 0.3s',
          mx: 'auto',
          position: 'relative',
        }}
      >
        {/* Initial search bar */}
        {!expanded && !voiceAssistantActive && (
          <Paper
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 4,
              py: 3,
              borderRadius: 4,
              boxShadow: 4,
              width: '100%',
              minHeight: 80,
            }}
            onClick={() => setExpanded(true)}
          >
            <Search sx={{ color: 'primary.main', mr: 2, fontSize: 32 }} />
            <TextField
              variant="standard"
              placeholder="Ask anything about phones..."
              value={query}
              onChange={handleInputChange}
              InputProps={{
                disableUnderline: true,
                style: { fontSize: 24, width: 400 }
              }}
              sx={{ flex: 1 }}
              onFocus={() => setExpanded(true)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              {browserSupportsSpeechRecognition && (
                <IconButton onClick={handleVoiceToggle} sx={{ color: 'grey.600', mr: 1 }}>
                  <MicOff />
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
        
        {/* Chat interface */}
        {(expanded || voiceAssistantActive) && (
          <Box sx={{ 
            bgcolor: '#f9f9f9', 
            borderRadius: 4, 
            boxShadow: 4, 
            overflow: 'hidden',
            maxHeight: '90vh', // Prevent page overflow
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              px: 3,
              py: 2,
              borderBottom: '1px solid #eee',
              bgcolor: 'white',
              flexShrink: 0
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                <Box component="span" sx={{ color: 'primary.main', mr: 1 }}>Shopping</Box>
                GPT
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {browserSupportsSpeechRecognition && (
                  <Tooltip title={voiceAssistantActive ? "Disable voice assistant" : "Enable voice assistant"}>
                    <IconButton 
                      color={voiceAssistantActive ? "primary" : "default"}
                      onClick={handleVoiceToggle}
                      size="small"
                    >
                      {voiceAssistantActive ? <VolumeUp /> : <VolumeOff />}
                    </IconButton>
                  </Tooltip>
                )}
                {/* FIXED: Restore Start Over button */}
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={handleResetConversation}
                  disabled={isLoading}
                  size="small"
                >
                  Start Over
                </Button>
              </Box>
            </Box>
            
            {/* Voice status banner */}
            {voiceAssistantActive && (
              <Box sx={{
                width: '100%',
                bgcolor: voiceSpeaking ? '#9c27b0' : '#e91e63',
                color: 'white',
                py: 1,
                px: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                flexShrink: 0
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  {voiceSpeaking ? (
                    <>
                      <VolumeUp sx={{ mr: 1, animation: 'pulse 1s infinite' }} />
                      <Typography variant="body2">Speaking...</Typography>
                    </>
                  ) : (
                    <>
                      <Mic sx={{ mr: 1, animation: listening ? 'pulse 1s infinite' : 'none' }} />
                      <Typography variant="body2">
                        {listening ? 'Listening...' : 'Voice ready'}
                      </Typography>
                      {voiceTranscript && (
                        <Typography variant="body2" sx={{ ml: 2, fontStyle: 'italic', opacity: 0.8 }}>
                          "{voiceTranscript}"
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
                <IconButton 
                  size="small" 
                  color="inherit" 
                  onClick={handleVoiceToggle}
                  sx={{ p: 1, ml: 2 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {/* FIXED: Chat history with proper scrolling */}
            <Box sx={{ 
              height: 500, 
              overflowY: 'auto',
              overflowX: 'hidden',
              p: 3,
              bgcolor: '#f9f9f9',
              flex: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#c1c1c1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#a8a8a8',
              }
            }}>
              {chatHistory.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: 'text.secondary',
                }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Welcome to ShoppingGPT
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'center', mb: 2 }}>
                    Ask me about phones, plans, or features!
                  </Typography>
                  {voiceAssistantActive && (
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                      <Mic sx={{ mr: 1, animation: listening ? 'pulse 1s infinite' : 'none' }} />
                      <Typography>
                        {listening ? 'Listening for your voice...' : 'Voice assistant ready'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                chatHistory.map((msg, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    {msg.type === 'user' && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Paper sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          maxWidth: '75%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          position: 'relative'
                        }}>
                          <Typography>{msg.content}</Typography>
                          {msg.isVoice && (
                            <Box sx={{ 
                              position: 'absolute', 
                              top: -8, 
                              right: 8, 
                              bgcolor: 'secondary.main', 
                              borderRadius: '50%',
                              p: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Mic sx={{ fontSize: 12, color: 'white' }} />
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    )}
                    {msg.type === 'bot' && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Paper sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          maxWidth: '75%',
                          bgcolor: 'white',
                          boxShadow: 1
                        }}>
                          <Typography>{msg.content}</Typography>
                        </Paper>
                      </Box>
                    )}
                    {msg.type === 'products' && (
                      <Box>
                        {msg.products.map((product, pIdx) => renderProductCard(product, pIdx))}
                      </Box>
                    )}
                  </Box>
                ))
              )}
              <div ref={chatEndRef} />
            </Box>
            
            {/* Input area */}
            <Box sx={{ 
              p: 2, 
              borderTop: '1px solid #eee',
              bgcolor: 'white',
              flexShrink: 0
            }}>
              <Box sx={{ display: 'flex', width: '100%' }}>
                <TextField
                  variant="outlined"
                  placeholder="Type your message..."
                  value={query}
                  onChange={handleInputChange}
                  fullWidth
                  inputRef={inputRef}
                  onFocus={handleInputFocus}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={isLoading || !query.trim()}
                  endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Send />}
                  sx={{ px: 3, borderRadius: 4 }}
                >
                  Send
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
      
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </Box>
  );
};

export default SmartSearchBar;