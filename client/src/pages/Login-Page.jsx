import React from "react";
import { useNavigate } from "react-router-dom";


const LoginPage = () => {
  const [Username, setUsername] = React.useState("");
  const [Password, setPassword] = React.useState("");
  const [Error, setError] = React.useState("");
  const [Message, setMessage] = React.useState("");
  const navigate = useNavigate();


  const handleSubmit =  async (e) => {
    e.preventDefault();
    //đợi test API
    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: Username,
        password: Password,
      }),
    });

    const data = await res.json();

    if(res.ok){
      sessionStorage.setItem("loggedIn", "true");
      setError("");
      setMessage("Đăng nhập thành công!");
      setTimeout(() => {
        setMessage("");
        navigate("/dashboard");
        window.location.reload();  
      }, 1000);
    }else{
      setError(data.error || "Đăng nhập thất bại");
    }
    // if (Username === "Cuong" && Password === "12345") {
    //   localStorage.setItem("loggedIn", "true");
    //   setError("");
    //   setMessage("Đăng nhập thành công!");
    //   setTimeout(() => {
    //     setMessage("");
    //     navigate("/");
    //     window.location.reload();  
    //   }, 2000);
    // } else {
    //   setError("Sai mật khẩu hoặc tên đăng nhập");
    // }
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
        {Message && <p style={{ color: "green" }}>{Message}</p>}
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
