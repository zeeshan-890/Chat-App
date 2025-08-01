import React from 'react';
import { userauthstore } from '../Store/UserAuthStore';
import { useNavigate } from 'react-router-dom';
import '../styles/incomingCallModal.css';
import Loader from './Loader';

const IncomingCallModal = () => {
  const navigate = useNavigate();
  const { incomingCall, answerCall, rejectCall, callStatus } = userauthstore();

  if (!incomingCall) return null;

  const handleAnswer = () => {
    // Pass the signal data to the store
    answerCall(incomingCall.signal, incomingCall.from);
    navigate('/videocall');
  };

  const handleReject = () => {
    rejectCall(incomingCall.from);
  };

  return (
    <div className="incoming-call-modal">
      <div className="incoming-call-content">
        <div className="ringing-dots">
          <div className="ringing-dot"></div>
          <div className="ringing-dot"></div>
          <div className="ringing-dot"></div>
        </div>
        <img 
          src={incomingCall.profileImg || '/avatar.jpg'} 
          alt="profile" 
          className="caller-avatar" 
        />
        <h2 className="call-title">{incomingCall.name} is calling...</h2>
        <p className="call-subtitle">📞 Incoming video call</p>
        <div className="call-buttons">
          <button onClick={handleAnswer} className="answer-button" disabled={callStatus === 'connected'}>
            {callStatus === 'connected' ? <Loader className="small" /> : 'Answer'}
          </button>
          <button onClick={handleReject} className="reject-button" disabled={callStatus === 'connected'}>
            {callStatus === 'connected' ? <Loader className="small" /> : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal; 