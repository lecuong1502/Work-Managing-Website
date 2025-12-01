import React, { useEffect } from "react";
import "../styles/Toast.css";

const Toast = ({ message, type, onClose, duration = 2000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            if(onClose) onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`toast ${type}`}>
            {message}
        </div>
    )
};

export default Toast;