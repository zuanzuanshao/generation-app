import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  LinearProgress,
  Grid,
} from '@mui/material';
import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';
import MovieIcon from '@mui/icons-material/Movie';
import ImageIcon from '@mui/icons-material/Image';
import { styled } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00e5ff' },
    secondary: { main: '#00e5ff' },
    background: {
      default: '#0a0e17',
      paper: '#141b2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b8c4',
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: alpha('#ffffff', 0.05),
            '&:hover': {
              backgroundColor: alpha('#ffffff', 0.08),
            },
            '&.Mui-focused': {
              backgroundColor: alpha('#ffffff', 0.08),
            },
          },
        },
      },
    },
  },
});

const API_URL = 'https://zhipuai.rsuxwvilc.top';

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 12px rgba(0, 0, 0, 0.15)',
  },
}));

function App() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const getApiKey = async () => {
    return process.env.REACT_APP_API_KEY;
  };

  const generateContent = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setStatus('Generating...');
    setProgress(0);

    try {
      const apiKey = await getApiKey();
      const endpoint = activeTab === 0 ? 'videos/generations' : 'images/generations';
      const model = activeTab === 0 ? 'cogvideox' : 'cogview-3';

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ prompt, model })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (activeTab === 0) {
        // Handle video generation
        const videoId = data.id;
        await checkVideoStatus(videoId);
      } else {
        // Handle image generation
        if (data.data && data.data.length > 0 && data.data[0].url) {
          setImageUrl(data.data[0].url);
          setStatus('Image generated!');
          setProgress(100);
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setStatus(`${error.message}. Please try again.`);
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const checkVideoStatus = async (id) => {
    let videoReady = false;
    let attempts = 0;
    const maxAttempts = 60;

    while (!videoReady && attempts < maxAttempts) {
      setStatus('Checking video status...');
      const statusResult = await fetch(`${API_URL}/async-result/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getApiKey()}`
        }
      }).then(res => res.json());

      if (statusResult.task_status === 'SUCCESS') {
        videoReady = true;
        const videoResult = statusResult.video_result[0];
        setVideoUrl(videoResult.url);
        setStatus('Video is ready!');
        setProgress(100);
      } else if (statusResult.task_status === 'PROCESSING') {
        setStatus('Video is processing, please wait...');
        setProgress((prev) => Math.min(prev + 10, 90));
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        throw new Error('Failed to generate video');
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Video generation timed out');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="h1" component="h1" gutterBottom align="center" color="primary" sx={{ mb: 4 }}>
            Next-Generation AI Creative Studio
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {activeTab === 0 ? 'AI Videos' : 'AI Images'}
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={activeTab === 0 ? "Enter video prompt" : "Enter image prompt"}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={generateContent}
                    disabled={isGenerating}
                    startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : (activeTab === 0 ? <MovieIcon /> : <ImageIcon />)}
                    sx={{
                      py: 1.5,
                      backgroundColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.8),
                      },
                    }}
                  >
                    {isGenerating ? 'Generating...' : (activeTab === 0 ? 'Generate Video' : 'Generate Image')}
                  </Button>
                  {status && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                      {status}
                    </Typography>
                  )}
                  {isGenerating && (
                    <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />
                  )}
                </CardContent>
              </StyledCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  {activeTab === 0 && videoUrl ? (
                    <Box sx={{ width: '100%', position: 'relative', paddingTop: '56.25%' }}>
                      <video
                        controls
                        width="100%"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <source src={videoUrl} type="video/mp4" />
                        Your browser does not support HTML5 video.
                      </video>
                    </Box>
                  ) : activeTab === 1 && imageUrl ? (
                    <CardMedia
                      component="img"
                      image={imageUrl}
                      alt="Generated image"
                      sx={{ maxHeight: 400, objectFit: 'contain' }}
                    />
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      Generated content will appear here
                    </Typography>
                  )}
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;