import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  Paper,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';
import MovieIcon from '@mui/icons-material/Movie';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import DownloadIcon from '@mui/icons-material/Download';
import { styled } from '@mui/material/styles';
import VideoCall from './Video';  // 导入 VideoCall 组件
import useSpeechRecognition from './SpeechRecognition';  // 导入 useSpeechRecognition 钩子

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
  const [inputMethod, setInputMethod] = useState('text'); // 新增状态来选择输入方式

  const transcript = useSpeechRecognition(); // 使用语音识别钩子

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setStatus('');
    setProgress(0);
    setVideoUrl('');
    setImageUrl('');
  };

  const handleInputMethodChange = (event) => {
    setInputMethod(event.target.value);
    setPrompt(''); // 清空 prompt
  };

  const getApiKey = async () => {
    return process.env.REACT_APP_API_KEY;
  };

  const generateContent = async () => {
    const finalPrompt = inputMethod === 'text' ? prompt : transcript;
    if (!finalPrompt.trim()) {
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
        body: JSON.stringify({ prompt: finalPrompt, model })
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

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    console.log('App.js - API Key:', process.env.REACT_APP_API_KEY);
    console.log('App.js - API Secret:', process.env.REACT_APP_API_SECRET);
    console.log('App.js - App ID:', process.env.REACT_APP_APP_ID);

    if (!process.env.REACT_APP_API_KEY || !process.env.REACT_APP_API_SECRET || !process.env.REACT_APP_APP_ID) {
      console.error('API credentials are missing. Please check your .env file.');
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="h1" component="h1" gutterBottom align="center" color="primary" sx={{ mb: 4 }}>
            Next-Generation AI Creative Studio
          </Typography>
          <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab label="AI Videos" icon={<MovieIcon />} iconPosition="start" />
            <Tab label="AI Images" icon={<ImageIcon />} iconPosition="start" />
            <Tab label="Video Call" icon={<VideocamIcon />} iconPosition="start" />
          </Tabs>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StyledCard>
                  <CardContent>
                    <Typography variant="h5" component="h2" gutterBottom>
                      AI Videos
                    </Typography>
                    <FormControl component="fieldset" sx={{ mt: 3 }}>
                      <RadioGroup row value={inputMethod} onChange={handleInputMethodChange}>
                        <FormControlLabel value="text" control={<Radio />} label="Text Input" />
                        <FormControlLabel value="voice" control={<Radio />} label="Voice Input" />
                      </RadioGroup>
                    </FormControl>
                    {inputMethod === 'text' ? (
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter video prompt"
                        sx={{ mb: 2 }}
                      />
                    ) : (
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        {transcript || 'Listening...'}
                      </Typography>
                    )}
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={generateContent}
                      disabled={isGenerating}
                      startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <MovieIcon />}
                      sx={{
                        py: 1.5,
                        backgroundColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.8),
                        },
                      }}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Video'}
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
                    {videoUrl ? (
                      <>
                        <Box sx={{ width: '100%', position: 'relative', paddingTop: '56.25%', mb: 2 }}>
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
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(videoUrl, 'generated-video.mp4')}
                        >
                          Download Video
                        </Button>
                      </>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        Generated content will appear here
                      </Typography>
                    )}
                  </CardContent>
                </StyledCard>
              </Grid>
            </Grid>
          )}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StyledCard>
                  <CardContent>
                    <Typography variant="h5" component="h2" gutterBottom>
                      AI Images
                    </Typography>
                    <FormControl component="fieldset" sx={{ mt: 3 }}>
                      <RadioGroup row value={inputMethod} onChange={handleInputMethodChange}>
                        <FormControlLabel value="text" control={<Radio />} label="Text Input" />
                        <FormControlLabel value="voice" control={<Radio />} label="Voice Input" />
                      </RadioGroup>
                    </FormControl>
                    {inputMethod === 'text' ? (
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter image prompt"
                        sx={{ mb: 2 }}
                      />
                    ) : (
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        {transcript || 'Listening...'}
                      </Typography>
                    )}
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={generateContent}
                      disabled={isGenerating}
                      startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <ImageIcon />}
                      sx={{
                        py: 1.5,
                        backgroundColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.8),
                        },
                      }}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Image'}
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
                    {imageUrl ? (
                      <>
                        <CardMedia
                          component="img"
                          image={imageUrl}
                          alt="Generated image"
                          sx={{ maxHeight: 400, objectFit: 'contain', mb: 2 }}
                        />
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(imageUrl, 'generated-image.png')}
                        >
                          Download Image
                        </Button>
                      </>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        Generated content will appear here
                      </Typography>
                    )}
                  </CardContent>
                </StyledCard>
              </Grid>
            </Grid>
          )}
          {activeTab === 2 && (
            <Paper elevation={3} sx={{ p: 2 }}>
              <VideoCall />
            </Paper>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;