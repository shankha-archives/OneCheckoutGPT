import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { 
  Box, Fab, Dialog, DialogContent, DialogTitle, Typography, Button, 
  CircularProgress, Paper, IconButton, Tooltip, Chip
} from '@mui/material';
import { 
  Mic, MicOff, VolumeUp, VolumeOff, Close, Refresh, 
  PlayArrow, Stop, Send
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const VoiceAssistant = ({ onAddToCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentStage, setCurrentStage] = useState('greeting');
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [plans, setPlans] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const synthRef = useRef(null);
  const analyzerRef = useRef(null);
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    
    // Fetch devices and plans data
    const fetchData = async () => {
      try {
        const [devicesResponse, plansResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/devices`),
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/plans`)
        ]);

        if (devicesResponse.ok && plansResponse.ok) {
          const devicesData = await devicesResponse.json();
          const plansData = await plansResponse.json();
          setDevices(devicesData);
          setPlans(plansData);
        }
      } catch (error) {
        console.error('Error fetching data for voice assistant:', error);
      }
    };

    fetchData();
  }, []);

  // Audio level monitoring for visual feedback
  const updateAudioLevel = useCallback(() => {
    if (analyzerRef.current && isRecording) {
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average);
      requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  // Start recording with Whisper-ready format
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      // Audio context for level monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyzerRef.current = audioContext.createAnalyser();
      source.connect(analyzerRef.current);
      
      // MediaRecorder for high-quality recording
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioWithWhisper(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateAudioLevel();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Unable to access microphone. Please check permissions.');
    }
  }, [updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [isRecording]);

  // Process audio with Whisper API
  const processAudioWithWhisper = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/transcribe`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const data = await response.json();
      const transcript = data.transcript;
      
      if (transcript && transcript.trim()) {
        // Add user message to conversation
        const userMessage = {
          type: 'user',
          content: transcript,
          timestamp: new Date().toLocaleTimeString()
        };
        setConversation(prev => [...prev, userMessage]);
        
        // Send to enhanced chat API
        await sendToAI(transcript);
      }
      
    } catch (error) {
      console.error('Whisper transcription error:', error);
      setError('Voice recognition failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send message to AI with enhanced conversation
  const sendToAI = async (message) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          session_id: sessionId 
        })
      });
      
      if (!response.ok) throw new Error('AI response failed');
      
      const data = await response.json();
      
      // Update session ID
      if (data.session_id) setSessionId(data.session_id);
      
      // Update conversation stage
      if (data.conversation_stage) setCurrentStage(data.conversation_stage);
      
      // Add AI response to conversation
      const aiMessage = {
        type: 'ai',
        content: data.response,
        timestamp: new Date().toLocaleTimeString(),
        devices: data.devices || [],
        plans: data.plans || [],
        next_action: data.next_action
      };
      
      setConversation(prev => [...prev, aiMessage]);
      
      // Handle voice response
      const speechText = data.voice_response || data.response;
      await speakText(speechText);
      
      // Handle navigation commands
      if (data.next_action === 'navigate_to_cart') {
        setTimeout(() => navigate('/cart'), 2000);
      }
      
    } catch (error) {
      console.error('AI chat error:', error);
      setError('Unable to process your request. Please try again.');
      
      const errorMessage = {
        type: 'ai',
        content: 'I apologize, but I encountered an error. Could you please repeat your request?',
        timestamp: new Date().toLocaleTimeString()
      };
      setConversation(prev => [...prev, errorMessage]);
    }
  };

  // Enhanced text-to-speech
  const speakText = async (text) => {
    if (!synthRef.current || !text) return;
    
    // Stop any current speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice selection for better quality
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Google') || voice.name.includes('Microsoft'))
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle voice assistant
  const toggleVoiceAssistant = () => {
    if (isOpen) {
      stopRecording();
      stopSpeaking();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      // Welcome message for new sessions
      if (conversation.length === 0) {
        setTimeout(() => {
          const welcomeMessage = {
            type: 'ai',
            content: "Hi! I'm your voice shopping assistant. I'll help you find the perfect phone and plan. What are you looking for today?",
            timestamp: new Date().toLocaleTimeString()
          };
          setConversation([welcomeMessage]);
          speakText(welcomeMessage.content);
        }, 500);
      }
    }
  };

  // Reset conversation
  const resetConversation = async () => {
    stopRecording();
    stopSpeaking();
    
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true, session_id: sessionId })
      });
    } catch (error) {
      console.error('Reset error:', error);
    }
    
    setConversation([]);
    setSessionId(null);
    setCurrentStage('greeting');
    setError(null);
    
    // New welcome message
    setTimeout(() => {
      const welcomeMessage = {
        type: 'ai',
        content: "Fresh start! I'm here to help you find the perfect phone and plan. What are you looking for?",
        timestamp: new Date().toLocaleTimeString()
      };
      setConversation([welcomeMessage]);
      speakText(welcomeMessage.content);
    }, 500);
  };

  // Add product to cart from voice recommendation
  const handleAddToCartFromVoice = (device, plan) => {
    if (addToCart) {
      addToCart({
        id: `${device.id}-${plan.id}`,
        device,
        plan,
        price: parseFloat(device.price) + parseFloat(plan.price),
        quantity: 1
      });
      
      speakText(`Great choice! I've added the ${device.name} with ${plan.name} plan to your cart.`);
    }
  };

  return (
    <>
      {/* Floating Voice Button */}
      <Tooltip title="Voice Assistant">
        <Fab
          color={isOpen ? "secondary" : "primary"}
          onClick={toggleVoiceAssistant}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            animation: isRecording ? 'pulse 1s infinite' : 'none',
            transform: isRecording ? `scale(${1 + audioLevel / 500})` : 'scale(1)',
            transition: 'transform 0.1s ease-in-out'
          }}
        >
          {isSpeaking ? <VolumeUp /> : <Mic />}
        </Fab>
      </Tooltip>

      {/* Voice Assistant Dialog */}
      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            height: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mic />
            <Typography>Voice Shopping Assistant</Typography>
            <Chip 
              label={currentStage.replace('_', ' ')} 
              size="small" 
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          </Box>
          <Box>
            <IconButton onClick={resetConversation} sx={{ color: 'white', mr: 1 }}>
              <Refresh />
            </IconButton>
            <IconButton onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          p: 0
        }}>
          {/* Error Display */}
          {error && (
            <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography variant="body2">{error}</Typography>
              <Button size="small" onClick={() => setError(null)} sx={{ color: 'inherit' }}>
                Dismiss
              </Button>
            </Box>
          )}

          {/* Conversation Display */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            p: 2,
            bgcolor: '#f5f5f5'
          }}>
            {conversation.map((message, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    bgcolor: message.type === 'user' ? 'primary.main' : 'white',
                    color: message.type === 'user' ? 'white' : 'text.primary',
                    ml: message.type === 'user' ? 2 : 0,
                    mr: message.type === 'user' ? 0 : 2
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                    {message.timestamp}
                  </Typography>
                  
                  {/* Product Recommendations */}
                  {message.devices && message.devices.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Recommended:</Typography>
                      {message.devices.map((device, idx) => {
                        const plan = message.plans && message.plans[idx] ? message.plans[idx] : plans[0];
                        return (
                          <Box key={idx} sx={{ 
                            p: 1, 
                            bgcolor: 'rgba(0,0,0,0.05)', 
                            borderRadius: 1, 
                            mb: 1 
                          }}>
                            <Typography variant="body2">
                              <strong>{device.name}</strong> + {plan?.name}
                            </Typography>
                            <Typography variant="caption">{device.reasoning}</Typography>
                            <Button 
                              size="small" 
                              variant="contained" 
                              sx={{ ml: 1, mt: 0.5 }}
                              onClick={() => handleAddToCartFromVoice(
                                devices.find(d => d.id.toString() === device.id.toString()),
                                plans.find(p => p.id.toString() === plan?.id.toString())
                              )}
                            >
                              Add to Cart
                            </Button>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Voice Controls */}
          <Box sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            bgcolor: 'white'
          }}>
            {!isRecording && !isProcessing && (
              <Button
                variant="contained"
                startIcon={<Mic />}
                onClick={startRecording}
                size="large"
                sx={{ borderRadius: 3, px: 4 }}
              >
                Start Speaking
              </Button>
            )}
            
            {isRecording && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={stopRecording}
                size="large"
                sx={{ borderRadius: 3, px: 4 }}
              >
                Stop Recording
              </Button>
            )}
            
            {isProcessing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography>Processing your voice...</Typography>
              </Box>
            )}
            
            {isSpeaking && (
              <Button
                variant="outlined"
                startIcon={<VolumeOff />}
                onClick={stopSpeaking}
                size="large"
                sx={{ borderRadius: 3 }}
              >
                Stop Speaking
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
};

export default VoiceAssistant;