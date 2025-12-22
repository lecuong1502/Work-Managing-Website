import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/register.css";
import Toast from "../components/Toast";
const RegisterPage = () => {
  const navigate = useNavigate();
  const [Error, setError] = React.useState("");
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    const { username, email, password } = form;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: username, email, password }),
      });


      const data = await res.json();

      if (res.ok) {
        if (data.user) {
             sessionStorage.setItem("user", JSON.stringify(data.user));
        }

        sessionStorage.setItem("user", JSON.stringify({ username, email, password }));
        setToast({ message: "Đăng ký thành công!", type: "success" });
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("Không kết nối được server:", err);
      alert("Không kết nối được server");
    }

  };

  return (
    <div className="auth-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="auth-overlay"></div>

      <div className="auth-card">
        <h2 className="auth-title">Register</h2>
        <p className="auth-subtitle">
          Create an account to manage your tasks efficiently.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <input
            className="auth-input"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            className="auth-input"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            className="auth-input"
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button type="submit" className="auth-btn primary">
            Register
          </button>
          {Error && <p style={{ color: "red" }}>{Error}</p>}

          <button
            type="button"
            className="auth-btn secondary"
            onClick={() => navigate("/login")}
          >
            Already have an account? Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
