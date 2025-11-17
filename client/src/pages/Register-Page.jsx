import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/register.css";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [Error, setError] = React.useState("");
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
      const res = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: username, email, password }),
      });


      const data = await res.json();

      if (res.ok) {
        setTimeout(() => {
          alert("Đăng ký thành công!");
          navigate("/login");
          window.location.reload();
        }, 1000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("Không kết nối được server:", err);
      alert("Không kết nối được server");
    }

    localStorage.setItem("user", JSON.stringify({ username, email, password }));

  };

  return (
    <div className="auth-page">
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
