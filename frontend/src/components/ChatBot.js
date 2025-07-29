import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, TextField, IconButton, Button, Paper, Avatar, Chip } from '@mui/material';
import { Close, Send, Mic, MicOff, SmartToy, Person } from '@mui/icons-material';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const ChatBot = ({ open, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', content: 'Hi! I am your AI Shopping Assistant. Tell me what kind of smartphone and plan you are looking for.', timestamp: new Date() }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  const handleVoiceToggle = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      if (browserSupportsSpeechRecognition) {
        SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
        setIsListening(true);
      }
    }
  };

  const sendMessage = (message = inputMessage) => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: message, timestamp: new Date() }]);
    setInputMessage('');
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Based on your request, here are some recommendations:',
        recommendations: [
          {
            id: '1-101',
            device: { name: 'iPhone 15 Pro', brand: 'Apple', price: 1199 },
            plan: { name: 'MagentaMobil M', price: 49.95, data_gb: 12 },
            explanation: 'Perfect for your needs: Premium device with enough data and 5G.',
          }
        ],
        timestamp: new Date(),
      }]);
    }, 1000);
  };

  React.useEffect(() => {
    if (transcript && !listening) {
      setInputMessage(transcript);
      resetTranscript();
    }
  }, [transcript, listening, resetTranscript]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Shopping Assistant</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {messages.map((message) => (
            <Box key={message.id} sx={{ display: 'flex', justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, maxWidth: '80%' }}>
                {message.type === 'bot' && (
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}><SmartToy sx={{ fontSize: 18 }} /></Avatar>
                )}
                <Paper sx={{ p: 2, bgcolor: message.type === 'user' ? 'primary.main' : 'grey.100', color: message.type === 'user' ? 'white' : 'text.primary', borderRadius: 2, maxWidth: '100%' }}>
                  <Typography variant="body1">{message.content}</Typography>
                  {message.recommendations && (
                    <Box sx={{ mt: 2 }}>
                      {message.recommendations.map((rec) => (
                        <Paper key={rec.id} sx={{ p: 2, mb: 1, bgcolor: 'white', border: '1px solid #E0E0E0', borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {rec.device.name} + {rec.plan.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                            {rec.plan.data_gb}GB • €{rec.plan.price}/month
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {rec.explanation}
                          </Typography>
                          <Button size="small" variant="contained" sx={{ mt: 1, borderRadius: 1 }}>
                            Choose Bundle
                          </Button>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Paper>
                {message.type === 'user' && (
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}><Person sx={{ fontSize: 18 }} /></Avatar>
                )}
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ p: 2, borderTop: '1px solid #E0E0E0' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Describe what you are looking for or speak to me..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {browserSupportsSpeechRecognition && (
              <IconButton onClick={handleVoiceToggle} color={listening ? "primary" : "default"} sx={{ bgcolor: listening ? 'primary.main' : 'grey.100', color: listening ? 'white' : 'text.secondary' }}>
                {listening ? <Mic /> : <MicOff />}
              </IconButton>
            )}
            <IconButton onClick={() => sendMessage()} disabled={!inputMessage.trim()} sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <Send />
            </IconButton>
          </Box>
          {listening && (
            <Typography variant="caption" sx={{ color: 'primary.main', mt: 1, display: 'block' }}>
              🎤 Listening... Speak now!
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ChatBot;