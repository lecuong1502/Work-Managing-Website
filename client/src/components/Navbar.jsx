import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const isLoggedIn = sessionStorage.getItem("loggedIn") === "true";
  const [showAlert, setShowAlert] = React.useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("loggedIn");
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);    
      navigate("/");
      window.location.reload();
    }, 1000);
  };

  return (
    <nav class="navbar">
      <div class="navbar-logo">
        <img src ="./assets/Logo.png" className="logo-img"/>
        <Link to="/">TaskManager</Link>
      </div>

      <div class="navbar-auth">
        {isLoggedIn ? (
          <button onClick={handleLogout} className="login-btn">Logout</button>
        ) : (
          <Link to="/login" className="login-btn">Login</Link>
        )}
      </div>

      {showAlert && (
        <div style={styles.alertBox}>
          <p style={{ margin: 0 }}>Đăng xuất thành công!</p>
        </div>
      )}
    </nav>
  );
};

const styles = {
  alertBox: {
    position: "fixed",
    top: "10%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "white",
    color: "black",
    padding: "20px 40px",
    borderRadius: "10px",
    boxShadow: "0 0 20px rgba(0,0,0,0.3)",
    zIndex: 1000,
    fontSize: "18px",
    fontWeight: "500",
    textAlign: "center",
    transition: "opacity 0.5s ease",
  },
};

export default Navbar;
