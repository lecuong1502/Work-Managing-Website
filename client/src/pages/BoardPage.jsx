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
  const [newListTitle, setNewListTitle] = useState("")
  const [renamingList, setRenamingList] = useState(null)
  const [newListName, setNewListName] = useState("")

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

  const updateBoardToStorage = (updatedBoard) => {
    const boards = JSON.parse(sessionStorage.getItem("boards")) || [];
    const index = boards.findIndex(b => b.id === updatedBoard.id);
    boards[index] = updatedBoard;
    sessionStorage.setItem("boards", JSON.stringify(boards));
  };

  const handleAddList = () => {
    if (!newListTitle.trim()) return;
    const newList = {
      id: Date.now(),
      title: newListTitle.trim(),
      cards: []
    };
    const updatedBoard = {
      ...board,
      lists: [...board.lists, newList]
    };
    setBoard(updatedBoard);
    updateBoardToStorage(updatedBoard);
    setNewListTitle("");
    setAddingList(false);
  };

  const handleRenameList = (listId) => {
    if (!newListName.trim()) return;
    const updatedLists = board.lists.map(list =>  
      list.id === listId ? { ...list, title: newListName.trim() } : list
    );
    const updatedBoard = {  
      ...board,
      lists: updatedLists
    };
    setBoard(updatedBoard);
    updateBoardToStorage(updatedBoard);
    setRenamingList(null);
    setNewListName("");
  };

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
              <div className="list-header">
                {renamingList === list.id ? (
                  <div className="rename-list-box">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)} />
                    <button onClick={() => handleRenameList(list.id)}>Save</button>
                    <button onClick={() => setRenamingList(null)}>Cancel</button>

                  </div>
                ) : (
                  <div className="list-title-row"> 
                    <h3>{list.title}</h3>
                    <button className ="rename-btn"onClick={() => {
                      setRenamingList(list.id);
                      setNewListName(list.title);
                    }}><img src="/assets/edit.svg" alt='rename'></img></button>
                  </div>
                )}
              </div>
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
              <input
                type="text"
                placeholder="List title..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                autoFocus
              />
              <button onClick={() => setAddingList(false)}>Cancel</button>
              <button onClick={handleAddList}>Add</button>
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
