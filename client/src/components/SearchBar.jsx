import React, { useState } from "react";
import "../styles/SearchBar.css";
import { Link, useNavigate } from "react-router-dom";
import Toast from "./Toast";
import { BellIcon } from "@heroicons/react/24/outline";
import Notification from "./Notification";

const SearchBar = ({ searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const isLoggedIn = sessionStorage.getItem("loggedIn") === "true";

  const handleLogout = () => {
    sessionStorage.removeItem("loggedIn");
    setToast({ message: "Đăng xuất thành công!", type: "success" });

    setTimeout(() => {
      navigate("/");
      window.location.reload();
    }, 2000);
  };

  return (
    <div className="search-bar-container">
      <div className="logo">
        <img src="/assets/Logo.png" className="logo-img" alt="logo" />
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

      {isLoggedIn && (
        <div className="right-actions">
          <Notification />
          <div
            className="avatar-container"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <img
              src="/assets/avatar.avif"
              className="avatar-img"
              alt="avatar"
            />

            {dropdownOpen && (
              <div className="dropdown-menu">
                <p onClick={handleLogout}>Logout</p>
              </div>
            )}
          </div>
        </div>
      )}

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
