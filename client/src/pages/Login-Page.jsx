import React from "react";

const LoginPage = () => {
  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <form style={styles.form}>
        <h2 style={styles.title}>Login</h2>
        <p style={styles.subtitle}>Login to manage your tasks efficiently</p>

        <input
          type="text"
          placeholder="Username"
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          required
        />

        <button type="submit" style={styles.button}>
          Login
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
    backgroundImage:
      "url('https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&w=1470&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.65), rgba(147,51,234,0.65))",
    zIndex: 1,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px",
    width: "320px",
    background: "rgba(255,255,255,0.5)",
    padding: "32px 24px",
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
    zIndex: 2,
  },
  title: {
    fontSize: "1.8rem",
    color: "#fff",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#e0e7ff",
    marginBottom: "16px",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "15px 12px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.3)",
    color: "#fff",
    outline: "none",
    transition: "all 0.25s ease",
  },
  button: {
    width: "100%",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "white",
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    marginTop: "8px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
};

export default LoginPage;
