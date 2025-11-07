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
    <div className="board-page">
      <div className="board-header">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          Trở lại
        </button>
        <h2>{board.name}</h2>
        <p className="description">{board.description}</p>
      </div>
      <div className="lists-container">
        {board.lists.map((list) => (
          <div key={list.id} className="list-column">
            <h3>{list.title}</h3>
            <div className="card-container">
              {list.cards.length ===0 && (
                <p className="empty">Không có thẻ nào</p>
              )}
              {list.cards.map((card)=>(
                <div key={card.id} className="card-item">
                  <h4>{card.title}</h4>
                  <p>{card.description}</p>
                  {card.dueDate && (
                    <small>Hạn:{card.dueDate}</small>
                  )}
                  {card.labels&&(
                    <div className="labels">
                      {card.labels.map((label,idx)=>(
                        <span key={idx} className="label">{label}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardPage;
