import React from "react";

const BottomToolbar = () => {
  const toolbarStyle = {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "60%",
    background: "white",
    padding: "10px 16px",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: "14px 14px 0 0",
    boxShadow: "0 -2px 14px rgba(0,0,0,0.15)",
  };

  const btnStyle = {
    background: "#f4f5f7",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    transition: "0.2s",
    fontWeight: "bold",
  };

  const btnHover = (e) => (e.target.style.background = "#e3e4e8");
  const btnLeave = (e) => (e.target.style.background = "#f4f5f7");

  return (
    <div style={toolbarStyle}>
      <button style={btnStyle} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
        📥 Hộp thư đến
      </button>

      <button style={btnStyle} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
        📅 Trình lập kế hoạch
      </button>

      <button style={btnStyle} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
        📊 Bảng thông tin
      </button>

      <button style={btnStyle} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
        📑 Chuyển đổi các bảng
      </button>
    </div>
  );
};

export default BottomToolbar;
