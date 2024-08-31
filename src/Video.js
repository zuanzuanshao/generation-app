import React, { useEffect, useRef } from 'react';
import { Grid, Typography } from '@mui/material';

// 这些常量应该从环境变量中获取，而不是硬编码
const APP_ID = process.env.REACT_APP_CALLS_APP_ID;
const APP_TOKEN = process.env.REACT_APP_CALLS_APP_TOKEN;
const API_BASE = `https://rtc.live.cloudflare.com/v1/apps/${APP_ID}`;

const VideoCall = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const initializeCall = async () => {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = media;

      const localSessionId = await createCallsSession();
      const localPC = await createPeerConnection();

      const transceivers = media.getTracks().map(track =>
        localPC.addTransceiver(track, { direction: 'sendonly' })
      );

      const localOffer = await localPC.createOffer();
      await localPC.setLocalDescription(localOffer);

      const pushTracksResponse = await fetch(`${API_BASE}/sessions/${localSessionId}/tracks/new`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${APP_TOKEN}` },
        body: JSON.stringify({
          sessionDescription: {
            sdp: localOffer.sdp,
            type: 'offer',
          },
          tracks: transceivers.map(({ mid, sender }) => ({
            location: 'local',
            mid,
            trackName: sender.track?.id,
          })),
        }),
      }).then(res => res.json());

      await localPC.setRemoteDescription(new RTCSessionDescription(pushTracksResponse.sessionDescription));

      // Echo functionality
      const remoteSessionId = await createCallsSession();
      const remotePC = await createPeerConnection();

      const tracksToPull = transceivers.map(({ sender }) => ({
        location: 'remote',
        trackName: sender.track?.id,
        sessionId: localSessionId,
      }));

      const pullResponse = await fetch(`${API_BASE}/sessions/${remoteSessionId}/tracks/new`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${APP_TOKEN}` },
        body: JSON.stringify({ tracks: tracksToPull }),
      }).then(res => res.json());

      await remotePC.setRemoteDescription(pullResponse.sessionDescription);
      const remoteAnswer = await remotePC.createAnswer();
      await remotePC.setLocalDescription(remoteAnswer);

      await fetch(`${API_BASE}/sessions/${remoteSessionId}/renegotiate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${APP_TOKEN}` },
        body: JSON.stringify({
          sessionDescription: {
            sdp: remoteAnswer.sdp,
            type: 'answer',
          },
        }),
      });

      remotePC.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Make sure to close the peer connections in the cleanup function
      return () => {
        localPC.close();
        remotePC.close();
        localVideoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
        remoteVideoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
      };
    };

    initializeCall();
  }, []); // Empty dependency array

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6">Local Stream</Typography>
        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%' }} />
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h6">Remote Echo Stream</Typography>
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%' }} />
      </Grid>
    </Grid>
  );
};

async function createCallsSession() {
  const sessionResponse = await fetch(`${API_BASE}/sessions/new`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${APP_TOKEN}` },
  }).then(res => res.json());
  return sessionResponse.sessionId;
}

async function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
    bundlePolicy: 'max-bundle',
  });
}

export default VideoCall;