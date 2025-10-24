import React from "react";

const LoginPage = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Login</h2>
        <form style={styles.form}>
          <input type="text" placeholder="Username" style={styles.input} />
          <input type="password" placeholder="Password" style={styles.input} />
          <button style={styles.button}>Login</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "80vh",
  },
  card: {
    width: "320px",
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "8px",
    fontSize: "1rem",
  },
  button: {
    background: "#3b82f6",
    color: "white",
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default LoginPage;
