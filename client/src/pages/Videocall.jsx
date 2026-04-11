import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userauthstore } from '../Store/UserAuthStore';
import { callPeer } from '../services/PeerService';
import toast from 'react-hot-toast';
import '../styles/videoCallPage.css';

const Videocall = () => {
  const myVideoRef = useRef();
  const userVideoRef = useRef();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  const {
    localStream,
    setLocalStream,
    user,
    selecteduser,
    call,
    peer,
    peerCall,
    setPeerCall,
    callStatus,
    callDuration,
    remoteStream,
    endCall,
    startCallDurationTimer,
    stopCallDurationTimer,
    stopCallTimeout,
  } = userauthstore();

  const isPeerOpen = Boolean(peer && peer.open);

  // 1. Initialize PeerJS on mount (if not already)
  useEffect(() => {
    if (user && (!peer || peer.destroyed || peer.disconnected)) {
      userauthstore.getState().initPeer(user._id);
    }
  }, [user, peer]);

  // 2. Get user media on mount
  useEffect(() => {
    let isMounted = true;

    const ensureLocalStream = async () => {
      if (localStream) {
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = localStream;
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setLocalStream(stream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        setErrorMessage('Could not access camera or microphone.');
        toast.error('Could not access camera or microphone.');
        console.error(err);
      }
    };

    ensureLocalStream();

    return () => {
      isMounted = false;
    };
  }, [localStream, setLocalStream]);

  // 3. Outgoing call logic
  useEffect(() => {
    if (!call || call.type !== 'outgoing' || !selecteduser?._id || !localStream || peerCall) {
      return;
    }

    if (!peer || peer.destroyed || peer.disconnected) {
      userauthstore.getState().initPeer(user?._id);
      return;
    }

    if (!isPeerOpen) {
      return;
    }

    let callObj;
    try {
      callObj = callPeer(
        selecteduser._id,
        localStream,
        (nextRemoteStream) => {
          if (userVideoRef.current) userVideoRef.current.srcObject = nextRemoteStream;
        },
        user?.name,
        user?.profileImg
      );
    } catch (err) {
      const message = err?.message || 'Could not start call. Please try again.';
      setErrorMessage(message);
      toast.error(message);
      userauthstore.getState().initPeer(user?._id);
      return;
    }

    if (!callObj || typeof callObj.on !== 'function') {
      setErrorMessage('Could not start call. Please try again.');
      toast.error('Could not start call. Please try again.');
      return;
    }

    setPeerCall(callObj);

    const handleClose = () => {
      endCall(selecteduser._id);
      navigate('/');
    };

    const handleError = (err) => {
      const message = err?.message || 'Call connection failed.';
      setErrorMessage('Call error: ' + message);
      toast.error('Call error: ' + message);
    };

    callObj.on('close', handleClose);
    callObj.on('error', handleError);

    return () => {
      callObj.off('close', handleClose);
      callObj.off('error', handleError);
    };
  }, [call, selecteduser, localStream, peer, isPeerOpen, peerCall, setPeerCall, endCall, navigate, user]);

  // 4. Start/stop call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      startCallDurationTimer();
      stopCallTimeout();
    }
    if (!call) {
      stopCallDurationTimer();
      stopCallTimeout();
      navigate('/');
    }
  }, [callStatus, call, startCallDurationTimer, stopCallDurationTimer, stopCallTimeout, navigate]);

  // 5. Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup if navigating away from /videocall, not remounting
      userauthstore.getState().cleanupMediaStreams();
      userauthstore.getState().stopCallDurationTimer();
      userauthstore.getState().stopCallTimeout();
      if (myVideoRef.current) myVideoRef.current.srcObject = null;
      if (userVideoRef.current) userVideoRef.current.srcObject = null;
    };
  }, []);

  // 6. Sync remoteStream to userVideoRef
  useEffect(() => {
    if (userVideoRef.current && remoteStream) {
      userVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 7. End call handler
  const handleEndCall = () => {
    if (call && call.user && call.user._id) {
      endCall(call.user._id);
    }
    navigate('/');
  };

  // 8. Format timer
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const remoteUser = call && call.type === 'outgoing' ? selecteduser : (call && call.user ? call.user : null);
  const remoteName = remoteUser ? remoteUser.name : '';
  const remoteProfile = remoteUser ? remoteUser.profileImg : '';

  return (
    <div className="call-container">
      {/* Other User's Video */}
      <video
        ref={userVideoRef}
        className="user-video"
        autoPlay
        playsInline
        onError={(e) => console.error("Remote video error:", e)}
      />

      {/* Error message display */}
      {errorMessage && (
        <div className="error-overlay">
          <p className="error-message">{errorMessage}</p>
          <button onClick={handleEndCall}>End Call</button>
        </div>
      )}

      {/* Top Info Bar */}
      <div className="top-bar">
        <img src={remoteProfile || '/avatar.jpg'} alt="User" className="user-avatar" />
        <span className="user-name">{remoteName}</span>
        <div className="call-info">
          <span className="call-status">
            {callStatus === 'connected'
              ? '🟢 Connected'
              : callStatus === 'ringing'
                ? '📞 Calling...'
                : `🔄 ${callStatus || 'Connecting'}`}
          </span>
          <span className="call-timer">
            {callStatus === 'connected'
              ? formatTime(callDuration)
              : '00:00'}
          </span>
        </div>
      </div>

      {/* Call Status Overlay */}
      {callStatus === 'ringing' && (
        <div className="call-status-overlay">
          <div className="ringing-animation">
            <div className="ringing-dot"></div>
            <div className="ringing-dot"></div>
            <div className="ringing-dot"></div>
          </div>
          <p className="ringing-text">Calling {remoteName}...</p>
        </div>
      )}

      {/* Your Video in Bottom Right */}
      <video
        ref={myVideoRef}
        className="my-video"
        autoPlay
        muted
        playsInline
        onError={(e) => console.error("Local video error:", e)}
      />

      {/* End Call Button */}
      <button className="end-call-button" onClick={handleEndCall}>
        🔴 End Call
      </button>
    </div>
  );
};

export default Videocall;
