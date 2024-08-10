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
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import MovieIcon from '@mui/icons-material/Movie';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const API_URL = 'https://open.bigmodel.cn/api/paas/v4';

function App() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerateClick = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    setIsGenerating(true);
    setStatus('正在生成视频...');

    const videoId = await generateVideo(prompt);

    if (videoId) {
      let videoReady = false;
      while (!videoReady) {
        setStatus('正在检查视频状态...');
        const statusResult = await checkVideoStatus(videoId);

        if (statusResult && statusResult.task_status === 'SUCCESS') {
          videoReady = true;
          const videoResult = statusResult.video_result[0];
          setVideoUrl(videoResult.url);
          setCoverImageUrl(videoResult.cover_image_url);
          setStatus('视频已就绪!');
        } else if (statusResult && statusResult.task_status === 'PROCESSING') {
          setStatus('视频正在处理中,请稍候...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          videoReady = true;
          setStatus('生成视频失败,请重试。');
        }
      }
    } else {
      setStatus('无法生成视频,请重试。');
    }

    setIsGenerating(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            文生视频
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入提示词"
              sx={{ mr: 2, maxWidth: '500px' }}
            />
            <Button
              variant="contained"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <MovieIcon />}
            >
              {isGenerating ? '生成中...' : '生成视频'}
            </Button>
          </Box>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {status}
          </Typography>
          {(coverImageUrl || videoUrl) && (
            <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
              {coverImageUrl && (
                <CardMedia
                  component="img"
                  image={coverImageUrl}
                  alt="Video cover"
                  sx={{ height: 300, objectFit: 'cover' }}
                />
              )}
              <CardContent>
                {videoUrl && (
                  <video controls width="100%">
                    <source src={videoUrl} type="video/mp4" />
                    您的浏览器不支持 HTML5 视频。
                  </video>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;