import React from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

const LoginPage = () => {
  const [Username, setUsername] = React.useState("");
  const [Password, setPassword] = React.useState("");
  const [Error, setError] = React.useState("");
  const [Message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      email: Username,
      password: Password,
    };
  
    try {
      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem("loggedIn", "true");
        sessionStorage.setItem("userId", data.id);
        sessionStorage.setItem("token",data.token);
        console.log("token login",data.token);
        console.log("Data:::Dcd",data)

        setError("");
        setMessage(data.message);
        setTimeout(() => {
          setMessage("");
          navigate("/dashboard");
          window.location.reload();
        }, 1000);
      } else {
        setError(data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      console.error("Không kết nối được server:", err);
      alert("Không kết nối được server");
    } finally{
      setLoading(false); 
    }
//-------ko chạy backend
  //   try {
  //     const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(payload),
  //     });

  //     const data = await res.json();

  //     if (res.ok) {
  //       sessionStorage.setItem("loggedIn", "true");
  //       sessionStorage.setItem("userId", 101);
  //       setError("");
  //       setMessage("Đăng nhập thành công!");
  //       setTimeout(() => {
  //         setMessage("");
  //         navigate("/dashboard");
  //         window.location.reload();
  //       }, 1000);
  //     } else {
  //       setError(data.message || "Đăng nhập thất bại");
  //     }
  //   } catch (err) {
  //     console.error("Không kết nối được server:", err);
  //     alert("Không kết nối được server");
  //   } finally{
  //     setLoading(false);
  //   }
  //   //-----------ko chạy backend
   };

  return (
    <div style={styles.container}>
      {loading && <LoadingOverlay message="Đang đăng nhập..." />}
      <div style={styles.overlay}></div>
      
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Login</h2>
        <p style={styles.subtitle}>Login to manage your tasks efficiently</p>

        <input
          type="email"
          placeholder="Username"
          style={styles.input}
          value={Username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
            setMessage("");
          }}
          required
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          value={Password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
            setMessage("");
          }}
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
    fontSize: "2rem",
    fontWeight: "800",
    color: "rgba(255,255,255,0.98)",
    marginBottom: "8px",
    textShadow: "0 2px 10px rgba(0,0,0,0.45)",
  },

  subtitle: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "rgba(255,255,255,0.95)",
    marginBottom: "22px",
    textAlign: "center",
    lineHeight: 1.45,
    textShadow: "0 1px 6px rgba(0,0,0,0.4)",
  },

  input: {
    width: "100%",
    padding: "13px 12px",
    fontSize: "1rem",
    fontWeight: "600",

    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.25)",
    color: "rgba(255,255,255,0.97)",

    outline: "none",
    transition: "all 0.25s ease",
  },
};

export default LoginPage;
