import { useEffect, useRef, useState } from 'react';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';

const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef(null);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_API_KEY;
    const apiSecret = process.env.REACT_APP_API_SECRET;
    const appId = process.env.REACT_APP_APP_ID;

    console.log('API Key:', apiKey);
    console.log('API Secret:', apiSecret);
    console.log('App ID:', appId);

    if (!apiKey || !apiSecret || !appId) {
      console.error('API credentials are missing. Please check your .env file.');
      return;
    }

    const hostUrl = 'wss://ws-api.xfyun.cn/v2/iat';

    const getAuthUrl = () => {
      try {
        const date = new Date().toUTCString();
        const signatureOrigin = `host: ws-api.xfyun.cn\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
        console.log('Signature Origin:', signatureOrigin);
        console.log('API Secret:', apiSecret);
        
        if (typeof apiSecret !== 'string' || apiSecret.length === 0) {
          throw new Error('API Secret is invalid');
        }

        const signatureSha = HmacSHA256(signatureOrigin, apiSecret);
        const signature = Base64.stringify(signatureSha);
        const authorization = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        const authUrl = `${hostUrl}?authorization=${btoa(authorization)}&date=${date}&host=ws-api.xfyun.cn`;
        return authUrl;
      } catch (error) {
        console.error('Error generating auth URL:', error);
        return null;
      }
    };

    const startWebSocket = () => {
      const authUrl = getAuthUrl();
      wsRef.current = new WebSocket(authUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connection opened');
        // Send initial message to start recognition
        const startMessage = {
          common: { app_id: appId },
          business: { language: 'zh_cn', domain: 'iat', accent: 'mandarin' },
          data: { status: 0, format: 'audio/L16;rate=16000', encoding: 'raw' }
        };
        wsRef.current.send(JSON.stringify(startMessage));
      };

      wsRef.current.onmessage = (event) => {
        const response = JSON.parse(event.data);
        if (response.data && response.data.result) {
          const result = response.data.result;
          const text = result.ws.map(w => w.cw.map(c => c.w).join('')).join('');
          setTranscript(prev => prev + text);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
    };

    startWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return transcript;
};

export default useSpeechRecognition;