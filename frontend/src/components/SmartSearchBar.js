import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Paper, Button, Typography, Grid, Card, CardMedia, CardContent, Chip } from '@mui/material';
import { Search, Close, Mic, MicOff } from '@mui/icons-material';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const SmartSearchBar = ({ devices, plans }) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const ref = useRef(null);
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setExpanded(false);
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (transcript && !listening) {
      setQuery(transcript);
      resetTranscript();
    }
  }, [transcript, listening, resetTranscript]);

  const handleVoiceToggle = (e) => {
    e.stopPropagation();
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setResults(
        devices.slice(0, 3).map(device => ({
          device,
          plan: plans[Math.floor(Math.random() * plans.length)],
          explanation: "Recommended based on your query and preferences."
        }))
      );
      setExpanded(true);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      mt: 6,
      mb: 4,
      width: '100%',
    }}>
      <Box
        ref={ref}
        sx={{
          width: expanded ? 700 : 500,
          transition: 'width 0.3s',
          mx: 'auto',
          position: 'relative',
        }}
      >
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
              style: { fontSize: 24, width: expanded ? 400 : 250 }
            }}
            sx={{ flex: 1 }}
            onFocus={() => setExpanded(true)}
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
            <IconButton
              onClick={() => {
                setExpanded(false);
                setResults([]);
                setQuery('');
              }}
              sx={{ color: 'grey.600', zIndex: 2 }}
              tabIndex={-1}
            >
              <Close />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            sx={{ ml: 3, px: 5, py: 2, fontSize: 20, fontWeight: 600, borderRadius: 2 }}
          >
            Search
          </Button>
        </Paper>

        {/* Expanded Results */}
        {expanded && results.length > 0 && (
          <Paper
            sx={{
              mt: 2,
              p: 3,
              borderRadius: 4,
              boxShadow: 4,
              width: '100%',
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
              AI Suggestions
            </Typography>
            <Grid container spacing={2} justifyContent="center">
              {results.map((result, idx) => (
                <Grid item xs={12} md={4} key={idx}>
                  <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={result.device.image}
                      alt={result.device.name}
                      sx={{ objectFit: 'contain', bgcolor: '#f8f8f8' }}
                      onError={e => { e.target.onerror = null; e.target.src = "/images/no-image.png"; }}
                    />
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {result.device.name} + {result.plan.name}
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        {result.device.features.map((feature, i) => (
                          <Chip key={i} label={feature} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {result.explanation}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                          onClick={() => alert(`Selected bundle: ${result.device.name} + ${result.plan.name}`)}
                        >
                          Select Bundle
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                          onClick={() => alert(`Added to cart: ${result.device.name}`)}
                        >
                          Add to Cart
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default SmartSearchBar;