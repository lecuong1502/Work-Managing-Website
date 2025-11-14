import React from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [Username, setUsername] = React.useState("");
  const [Password, setPassword] = React.useState("");
  const [Error, setError] = React.useState("");
  const [Message, setMessage] = React.useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: Username,
        password: Password,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      sessionStorage.setItem("loggedIn", "true");
      sessionStorage.setItem("userId", 101);

      setError("");
      setMessage("Đăng nhập thành công!");

      setTimeout(() => {
        setMessage("");
        navigate("/dashboard");
        window.location.reload();
      }, 1000);
    } else {
      setError(data.error || "Đăng nhập thất bại");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>

      <form style={styles.form} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Login</h2>
        <p style={styles.subtitle}>Login to manage your tasks efficiently</p>

        <input
          type="email"
          placeholder="Username"
          style={styles.input}
          value={Username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          value={Password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {Error && <p style={{ color: "red" }}>{Error}</p>}
        {Message && <p style={{ color: "limegreen" }}>{Message}</p>}

        <button type="submit" className="auth-btn primary">
          Login
        </button>

        <button
          type="button"
          className="auth-btn secondary"
          onClick={() => navigate("/register")}
        >
          Don't have an account? Register
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundImage: "url('/assets/backgroundLogin.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(200,220,255,0.45), rgba(147,51,234,0.45))",
    zIndex: 1,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px",
    width: "340px",

    background: "rgba(255,255,255,0.33)",
    padding: "36px 32px",
    borderRadius: "22px",

    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",

    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
    zIndex: 2,
  },

  title: {
    fontSize: "1.9rem",
    color: "#fff",
    fontWeight: "700",
    marginBottom: "6px",
  },

  subtitle: {
    fontSize: "0.95rem",
    color: "rgba(255,255,255,0.88)",
    marginBottom: "20px",
    textAlign: "center",
    lineHeight: 1.4,
  },

  input: {
    width: "100%",
    padding: "13px 12px",
    fontSize: "0.95rem",

    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.22)",
    color: "#fff",

    outline: "none",
    transition: "all 0.25s ease",
  },
};

export default LoginPage;
