import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [showAlert, setShowAlert] = React.useState(false);

  useEffect(() => {
    // giả lập lấy danh sách boards
    const savedBoards = JSON.parse(localStorage.getItem("boards")) || [
      { id: 1, name: "Công việc nhóm" },
      { id: 2, name: "Dự án React" },
      { id: 3, name: "Việc cá nhân" },
    ];
    setBoards(savedBoards);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("loggedIn");
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);    
      navigate("/");
      window.location.reload();
    }, 1000);
  };

  const handleBoardClick = (boardId) => {
    navigate(`/board/${boardId}`);
  };

  const handleAddBoard = () => {
    const name = prompt("Nhập tên board mới:");
    if (name) {
      const newBoard = { id: Date.now(), name };
      const updatedBoards = [...boards, newBoard];
      setBoards(updatedBoards);
      localStorage.setItem("boards", JSON.stringify(updatedBoards));
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📋 My Boards</h1>
        <button onClick={handleAddBoard}>+ Thêm board</button>
        <button onClick={handleLogout}>Đăng xuất</button>
      </div>

      <div className="board-list">
        {boards.map((board) => (
          <div
            key={board.id}
            className="board-card"
            onClick={() => handleBoardClick(board.id)}
          >
            {board.name}
          </div>
        ))}
      </div>
      {showAlert && (
        <div style={styles.alertBox}>
          <p style={{ margin: 0 }}>Đăng xuất thành công!</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
