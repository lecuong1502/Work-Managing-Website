import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/BoardPage.css";
import SearchBar from "../components/SearchBar";
import CardModal from "../components/CardModal"


const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingCard, setAddingCard] = useState({})
  const [addingList, setAddingList] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)

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
    <div>
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <div className="board-page" style={{ background: board.color }}>
        <div className="board-header">
          <div>
            <h2>{board.name}</h2>
            <p className="description">{board.description}</p>
          </div>
        </div>
        <div className="lists-container">
          {board.lists.map((list) => (
            <div key={list.id} className="list-column">
              <h3>{list.title}</h3>
              <div className="card-container">
                {list.cards.length === 0 && (
                  <p className="empty">Không có thẻ nào</p>
                )}
                {list.cards.map((card) => (
                  <div key={card.id} className="card-item" onClick={() => setSelectedCard(card)}>
                    <h4>{card.title}</h4>
                    <p>{card.description}</p>
                    {card.dueDate && (
                      <small>Hạn:{card.dueDate}</small>
                    )}
                    {card.labels && (
                      <div className="labels">
                        {card.labels.map((label, idx) => (
                          <span key={idx} className="label">{label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {addingCard[list.id] ? (
                  <div className="add-card-form">
                    <input type="text" placeholder="Card title..." />
                    <button onClick={() => setAddingCard(prev => ({ ...prev, [list.id]: false }))}>Cancel</button>
                    <button>Add</button>
                  </div>
                ) : (<button
                  className="add-card-btn"
                  onClick={() => setAddingCard(prev => ({ ...prev, [list.id]: true }))}
                >
                  + Add a card
                </button>
                )}

              </div>
            </div>
          ))}
          {addingList ? (
            <div className="add-list-form">
              <input type="text" placeholder="List title..." />
              <button onClick={() => setAddingList(false)}>Cancel</button>
              <button>Add</button>
            </div>
          ) : (
            <div className="add-list" onClick={() => setAddingList(true)}>
              + Add another list
            </div>)}
        </div>
        {selectedCard && (
          <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
        )}
      </div>
    </div>
  );
};

export default BoardPage;
