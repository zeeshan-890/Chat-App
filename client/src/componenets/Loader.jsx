import React from 'react';
import './Loader.css';

const Loader = ({className = ''}) => (
  <div className={`loader-container ${className}`}>
    <div className="loader-spinner"></div>
  
  </div>
);

export default Loader; 