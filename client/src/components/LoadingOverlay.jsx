import React from "react";
import "../styles/LoadingOverlay.css";

const LoadingOverlay = ({ message = "Đang tải..." }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
