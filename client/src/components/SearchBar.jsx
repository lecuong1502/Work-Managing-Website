import React from "react";
import "../styles/SearchBar.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const SearchBar = ({ searchTerm, setSearchTerm }) => {
    const navigate = useNavigate();
    const [showAlert, setShowAlert] = useState(false);

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
        <div className="search-bar-container">
            <div className="logo">
                <img src="./assets/Logo.png" className="logo-img" />
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

            <button
                className="btn-logout"
                onClick={handleLogout}
            >
                Logout
            </button>

            {showAlert && (
                <div className="alert-box">
                    <p>Đăng xuất thành công!</p>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
