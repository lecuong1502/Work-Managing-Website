import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/BoardPage.css";
import SearchBar from "../components/SearchBar";
import CardModal from "../components/CardModal";
import ListColumn from "../components/ListColumn";
import CardItem from "../components/CardItem";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import BottomToolbar from "../components/BottomToolbar";


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

  const handleAddList = async (e) => {
    if (!newListTitle.trim()) return;
    const newList = {
      title: newListTitle.trim()
    };

    try {
      const res = await fetch("http://localhost:3000/api/boards/" + board.id + "/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify(newList)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Lỗi thêm list mới");
        return;
      }
      const updatedBoard = {
        ...board,
        lists: [...board.lists, data]
      };

      setBoard(updatedBoard);
      updateBoardToStorage(updatedBoard);
      setNewListTitle("");
      setAddingList(false);
    } catch (err) {
      console.error("Lỗi thêm list mới:", err);
    }
  };

  const handleRenameList = async(listId) => {
    console.log("Renaming list",listId,newListName);
    if (!newListName.trim()) return;
    const bodyData = {
      title: newListName.trim()
    };
    try {
      const res = await fetch("http://localhost:3000/api/boards/" + board.id + "/lists/" + listId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Lỗi thay doi ten");
        return;
      }
      const updatedLists = board.lists.map(list =>  
      list.id === listId ? data : list
    );
      const updatedBoard = {
      ...board,
      lists: updatedLists
    };

      setBoard(updatedBoard);
      updateBoardToStorage(updatedBoard);
      setRenamingList(null);
      setNewListName("");
    } catch {
      console.error("Lỗi thêm list mới:", err);
    }
    // const updatedLists = board.lists.map(list =>  
    //   list.id === listId ? { ...list, title: newListName.trim() } : list
    // );
    // const updatedBoard = {
    //   ...board,
    //   lists: updatedLists
    // };

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

        <DndProvider backend={HTML5Backend}>
          <div className="lists-container">
            {board.lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                board={board}
                setBoard={setBoard}
                renamingList={renamingList}
                setRenamingList={setRenamingList}
                newListName={newListName}
                setNewListName={setNewListName}
                handleRenameList={handleRenameList}
                setAddingCard={setAddingCard}
                addingCard={addingCard}
                selectedCard={selectedCard}
                setSelectedCard={setSelectedCard}
              />
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
        </DndProvider>
        {selectedCard && (
          <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
        )}
      </div>
      <BottomToolbar />
    </div>
  );
};

export default BoardPage;
