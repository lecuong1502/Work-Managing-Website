import React from "react";
import "../styles/SearchBar.css";
import { Link, useNavigate } from "react-router-dom";
import Toast from "./Toast";
import { useState } from "react";

const SearchBar = ({ searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const handleLogout = () => {
    sessionStorage.removeItem("loggedIn");
    setToast({ message: "Đăng xuất thành công!", type: "success" });
    setTimeout(() => {
      setShowAlert(false);
      navigate("/");
      window.location.reload();
    }, 2000);
  };

  return (
    <div className="search-bar-container">
      <div className="logo">
        <img src="/assets/Logo.png" className="logo-img" />
        <Link to="/">TaskManager</Link>
      </div>

      <div className="search-bar">
        <i className="fa fa-search" style={{ color: "#888" }}></i>
        <input
          type="text"
          placeholder="Tìm kiếm board..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div
        className="avatar-container"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <img src="/assets/avatar.avif" className="avatar-img" alt="avatar" />
        {dropdownOpen && (
          <div className="dropdown-menu">
            <p onClick={handleLogout}>Logout</p>
            {}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default SearchBar;
