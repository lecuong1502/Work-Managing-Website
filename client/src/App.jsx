import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/Login-Page";
import HomePage from "./pages/Home-Page";
import DashboardPage from "./pages/Dashboard";
import BoardPage from "./pages/BoardPage";
import RegisterPage from "./pages/Register-Page";

function App() {
  const isLoggedIn = sessionStorage.getItem("loggedIn") === "true";

  return (
    <Router>
      {isLoggedIn ? (
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/board/:boardId" element={<BoardPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      ) : (
        <>
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </>
      )}
    </Router>
  );
}

export default App;
