import { useEffect, useRef, useState } from 'react';
import CryptoJS from 'crypto-js/core';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';

const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const getApiCredentials = async () => {
      try {
        const apiKey = await getXunfeiApiKey();
        const apiSecret = await getXunfeiApiSecret();
        const appId = await getXunfeiApiId();
        return { apiKey, apiSecret, appId };
      } catch (error) {
        console.error('Error getting API credentials:', error);
        return null;
      }
    };

    const getAuthUrl = async (apiKey, apiSecret) => {
      try {
        const url = 'wss://ws-api.xfyun.cn/v2/iat';
        const host = 'ws-api.xfyun.cn';
        const date = new Date().toUTCString();
        const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
        const signatureSha = HmacSHA256(signatureOrigin, apiSecret);
        const signature = Base64.stringify(signatureSha);
        const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        const authorization = Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin));
        return `${url}?authorization=${authorization}&date=${date}&host=${host}`;
      } catch (error) {
        console.error('Error generating auth URL:', error);
        return null;
      }
    };

    const startWebSocket = async () => {
      const credentials = await getApiCredentials();
      if (!credentials) return;

      const { apiKey, apiSecret, appId } = credentials;
      const authUrl = await getAuthUrl(apiKey, apiSecret);
      if (!authUrl) return;

      const ws = new WebSocket(authUrl);

      ws.onopen = async () => {
        console.log('WebSocket connection opened');
        const params = {
          common: { app_id: appId },
          business: {
            language: 'zh_cn',
            domain: 'iat',
            accent: 'mandarin',
            vad_eos: 5000,
          },
          data: {
            status: 0,
            format: 'audio/L16;rate=16000',
            encoding: 'raw',
          },
        };
        ws.send(JSON.stringify(params));

        // 获取音频流
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = mediaStream;

        // 创建 MediaRecorder
        const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64data = reader.result.split(',')[1];
              const audioData = {
                data: {
                  status: 1,
                  format: 'audio/L16;rate=16000',
                  audio: base64data,
                  encoding: 'raw',
                },
              };
              ws.send(JSON.stringify(audioData));
            };
            reader.readAsDataURL(event.data);
          }
        };

        mediaRecorder.start(100); // 每100ms发送一次音频数据
      };

      ws.onmessage = (event) => {
        const result = JSON.parse(event.data);
        if (result.data && result.data.result) {
          const text = result.data.result.ws.map(w => w.cw[0].w).join('');
          setTranscript(prevTranscript => prevTranscript + text);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      wsRef.current = ws;
    };

    startWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return transcript;
};

// 这些函数需要在实际应用中实现，用于异步获取API凭证
const getXunfeiApiKey = async () => {
  return process.env.REACT_APP_XUNFEI_API_KEY;
};

const getXunfeiApiSecret = async () => {
  // 实现异步获取 API Secret 的逻辑
  return process.env.REACT_APP_XUNFEI_API_SECRET;
};

const getXunfeiApiId = async () => {
  // 实现异步获取 App ID 的逻辑
  return process.env.REACT_APP_XUNFEI_API_ID;
};

export default useSpeechRecognition;