import React, { useState, useEffect, useRef } from "react";
import "../styles/SearchBar.css";
import { Link, useNavigate } from "react-router-dom";
import Toast from "./Toast";
import { BellIcon } from "@heroicons/react/24/outline";
import Notification from "./Notification";

const SearchBar = ({ searchTerm, setSearchTerm }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const searchRef = useRef(null);


  const isLoggedIn = sessionStorage.getItem("loggedIn") === "true";

  const handleLogout = () => {
    sessionStorage.removeItem("loggedIn");
    setToast({ message: "Đăng xuất thành công!", type: "success" });

    setTimeout(() => {
      navigate("/");
      window.location.reload();
    }, 500);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("boards");
    if (saved) {
      try {
        setBoards(JSON.parse(saved));
      } catch (e) {
        console.error("Parse boards error", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBoards = boards
    .filter(b => b && b.id && !String(b.id).startsWith("inbox_"))
    .filter(b =>
      b.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const getInitials = (name) => {
    if (!name) return "U"; // Mặc định là U (User) nếu không có tên
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    // Lấy chữ cái đầu của từ đầu tiên và từ cuối cùng
    const firstLetter = parts[0].charAt(0).toUpperCase();
    const lastLetter = parts[parts.length - 1].charAt(0).toUpperCase();
    return firstLetter + lastLetter;
  };

  return (
    <div className="search-bar-container">
      <div className="logo">
        <img src="/assets/Logo.png" className="logo-img" alt="logo" />
        <Link to="/">TaskManager</Link>
      </div>

      <div className="search-wrapper" ref={searchRef}>

        <div className="search-bar" ref={searchRef}>
          <i className="fa fa-search" style={{ color: "#888" }}></i>
          <input
            type="text"
            placeholder="Tìm kiếm board..."
            value={searchTerm}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchOpen(true);
            }}
          />
        </div>

        {searchOpen && (
          <div className="search-dropdown">
            {filteredBoards.length === 0 && (
              <div className="search-empty">Không tìm thấy board</div>
            )}

            {filteredBoards.map(board => (
              <div
                key={board.id}
                className="search-item"
                onClick={() => {
                  navigate(`/boards/${board.id}`);
                  setSearchOpen(false);
                  setSearchTerm("");
                }}
              >
                <div
                  className="search-color"
                  style={{ background: board.color }}
                />
                <span>{board.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoggedIn && (
        <div className="right-actions">
          <Notification />
          <div
            className="avatar-container"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="avatar-circle">
              {getInitials(user.username)}
            </div>

            {dropdownOpen && (
              <div className="dropdown-menu">
                {/* Phần thông tin người dùng */}
                <div className="dropdown-header">
                  <p className="account-label">Account</p>
                  <div className="user-info">
                    <div className="avatar-circle">
                      {getInitials(user.username)}
                    </div>
                    <div className="user-text">
                      <span className="user-name">User</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                {/* Các liên kết chức năng */}
                <div className="dropdown-list">
                  <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/settings" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Setting
                  </Link>
                  <div className="dropdown-item" onClick={() => { /* logic đổi theme */ }}>
                    Mode
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-list">
                  <div className="dropdown-item logout-btn" onClick={handleLogout}>
                    Logout
                  </div>
                </div>
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
