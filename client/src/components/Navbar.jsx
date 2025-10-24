import React from "react";
import { Link } from "react-router-dom";
import "../styles/navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">TaskManager</Link>
      </div>

      <div className="navbar-auth">
        <Link to="/login" className="login-btn">Login</Link>
      </div>
    </nav>
  );
};

export default Navbar;
