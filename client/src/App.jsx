import React, { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
// import { useNavigate } from 'react-router-dom';
import './App.css'
// import { useState,useEffect } from "react"
import { Toaster } from 'react-hot-toast';
import { userauthstore } from './Store/UserAuthStore';


function App() {

  useEffect(() => {
    const primeAudio = () => {
      const playRingtone = userauthstore.getState().playRingtone;
      playRingtone(true); // Prime and pause
      window.removeEventListener('click', primeAudio);
      window.removeEventListener('keydown', primeAudio);
    };
    window.addEventListener('click', primeAudio);
    window.addEventListener('keydown', primeAudio);
    return () => {
      window.removeEventListener('click', primeAudio);
      window.removeEventListener('keydown', primeAudio);
    };
  }, []);

  // const {setIncomingCall} = userauthstore()

  // useEffect(() => {
  //   // Fake test
  //   setTimeout(() => {
  //     setIncomingCall  ({
  //       from: "123",
  //       name: "Test User",
  //       profileImg: "",
  //       signal: null
  //     });
  //   }, 2000);
  // }, []);
  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          // Default options for all toasts
          style: {
            borderRadius: '10px',
            background: '#1f2937',
            color: '#fff',
            width: '350px',
            fontSize: '14px',
            padding: '12px 16px'
          },
          success: {
            style: {
              background: '#16a34a', // green
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#94291b', // red
              color: 'white',
              fontSize: '19px'
            },
          },
        }}
      />

    </>
  )
}

export default App
