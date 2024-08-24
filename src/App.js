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
  Paper,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import MovieIcon from '@mui/icons-material/Movie';
import ImageIcon from '@mui/icons-material/Image';
import { keyframes } from '@emotion/react';

const pulseKeyframe = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(63, 81, 181, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(63, 81, 181, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(63, 81, 181, 0);
  }
`;

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#00e5ff',
    },
    background: {
      default: '#0a192f',
      paper: '#112240',
    },
    text: {
      primary: '#e6f1ff',
      secondary: '#8892b0',
    },
  },
  typography: {
    fontFamily: "'Roboto Mono', monospace",
    h3: {
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 30,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#8892b0',
            },
            '&:hover fieldset': {
              borderColor: '#00e5ff',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00e5ff',
            },
          },
        },
      },
    },
  },
});

const API_URL = 'https://empty-bush-798a.realzuanzuan.workers.dev';

function App() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const getApiKey = async () => {
    return process.env.REACT_APP_API_KEY;
  };

  const generateVideo = async (prompt) => {
    try {
      const response = await fetch(`${API_URL}/videos/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + await getApiKey()
        },
        body: JSON.stringify({ prompt: prompt, model: "cogvideox" })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('生成视频时出错:', error);
      return null;
    }
  };

  const generateImage = async (prompt) => {
    try {
      const response = await fetch(`${API_URL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + await getApiKey()
        },
        body: JSON.stringify({ prompt: prompt, model: "cogview-3" })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.data && data.data.length > 0 && data.data[0].url) {
        return data.data[0].url;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('生成图片时出错:', error);
      return null;
    }
  };

  const checkVideoStatus = async (id) => {
    try {
      const response = await fetch(`${API_URL}/async-result/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + await getApiKey()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('检查视频状态时出错:', error);
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    setIsGenerating(true);
    setStatus('正在生成...');
    setProgress(0);

    try {
      if (activeTab === 0) {
        // 生成视频
        const videoId = await generateVideo(prompt);
        if (videoId) {
          let videoReady = false;
          let attempts = 0;
          const maxAttempts = 60; // 5分钟超时（假设每次检查间隔5秒）
          while (!videoReady && attempts < maxAttempts) {
            setStatus('正在检查视频状态...');
            const statusResult = await checkVideoStatus(videoId);

            if (statusResult && statusResult.task_status === 'SUCCESS') {
              videoReady = true;
              const videoResult = statusResult.video_result[0];
              setVideoUrl(videoResult.url);
              setCoverImageUrl(videoResult.cover_image_url);
              setStatus('视频已就绪!');
              setProgress(100);
            } else if (statusResult && statusResult.task_status === 'PROCESSING') {
              setStatus('视频正在处理中,请稍候...');
              setProgress((prev) => Math.min(prev + 10, 90));
              await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
              videoReady = true;
              throw new Error('生成视频失败');
            }
            attempts++;
          }
          if (attempts >= maxAttempts) {
            throw new Error('生成视频超时');
          }
        } else {
          throw new Error('无法生成视频');
        }
      } else {
        // 生成图片
        setStatus('正在生成图片...');
        setProgress(50); // 设置进度到50%
        const imageUrl = await generateImage(prompt);
        if (imageUrl) {
          setImageUrl(imageUrl);
          setStatus('图片已生成!');
          setProgress(100);
        } else {
          throw new Error('生成图片失败');
        }
      }
    } catch (error) {
      console.error('生成内容时出错:', error);
      setStatus(`${error.message}，请重试。`);
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 229, 255, 0.05)',
              zIndex: 0,
              pointerEvents: 'none',
            }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h3" component="h1" gutterBottom align="center" color="secondary" sx={{ textShadow: '0 0 10px rgba(0, 229, 255, 0.5)' }}>
                AI 内容生成器
              </Typography>
              <Divider sx={{ my: 3, bgcolor: 'secondary.main' }} />
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} centered sx={{ mb: 3 }}>
                <Tab icon={<MovieIcon />} label="生成视频" />
                <Tab icon={<ImageIcon />} label="生成图片" />
              </Tabs>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeTab === 0 ? "输入视频提示词" : "输入图片提示词"}
                  sx={{ mb: 2, input: { color: 'text.primary' } }}
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : (activeTab === 0 ? <MovieIcon /> : <ImageIcon />)}
                  sx={{
                    minWidth: 200,
                    animation: isGenerating ? `${pulseKeyframe} 2s infinite` : 'none',
                  }}
                >
                  {isGenerating ? '生成中...' : (activeTab === 0 ? '生成视频' : '生成图片')}
                </Button>
              </Box>
              {status && (
                <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
                  {status}
                </Typography>
              )}
              {isGenerating && (
                <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />
              )}
              {activeTab === 0 && (coverImageUrl || videoUrl) && (
                <Card sx={{ mt: 4, borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
                  {coverImageUrl && (
                    <CardMedia
                      component="img"
                      image={coverImageUrl}
                      alt="Video cover"
                      sx={{ height: 300, objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ p: 3 }}>
                    {videoUrl && (
                      <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                        <video
                          key={videoUrl}
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
                          您的浏览器不支持 HTML5 视频。
                        </video>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
              {activeTab === 1 && imageUrl && (
                <Card sx={{ mt: 4, borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
                  <CardMedia
                    component="img"
                    image={imageUrl}
                    alt="Generated image"
                    sx={{ height: 'auto', maxHeight: 500, objectFit: 'contain' }}
                  />
                </Card>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;