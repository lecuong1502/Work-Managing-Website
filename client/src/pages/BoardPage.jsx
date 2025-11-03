import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/BoardPage.css";

const BoardPage = () => {
  const { boardId } = useParams(); 
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);

  useEffect(() => {
    const savedBoards = JSON.parse(sessionStorage.getItem("boards")) || [];
    const foundBoard = savedBoards.find(b => b.id === Number(boardId));

    if (foundBoard) {
      setBoard(foundBoard);
    } else {
      alert("Board không tồn tại!");
      navigate("/dashboard");
    }
  }, [boardId, navigate]);

  if (!board) return <p>Đang tải...</p>;

   return (
    <div className="board-container">
      <h1>{board.name}</h1>
      <p>ID board: {boardId}</p>

      <div className="board-columns">
        <div className="board-column">
          <h3>📝 To Do</h3>
        </div>
        <div className="board-column">
          <h3>⚙️ In Progress</h3>
        </div>
        <div className="board-column">
          <h3>✅ Done</h3>
        </div>
      </div>
    </div>
  );
};

export default BoardPage;
