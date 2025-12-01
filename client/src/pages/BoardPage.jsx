import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import "../styles/BoardPage.css";
import SearchBar from "../components/SearchBar";
import CardModal from "../components/CardModal";
import ListColumn from "../components/ListColumn";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import BottomToolbar from "../components/BottomToolbar";
import Loading from "../components/LoadingOverlay"
import InboxPanel from "../components/InboxPanel";
import BoardSwitcher from "../components/BoardSwitcher";


const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [board, setBoard] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingCard, setAddingCard] = useState({});
  const [addingList, setAddingList] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newListTitle, setNewListTitle] = useState("");
  const [renamingList, setRenamingList] = useState(null);
  const [newListName, setNewListName] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const [openPanel, setOpenPanel] = useState(null);

  const isCalendarMode = location.pathname.includes("/calendar");

  useEffect(() => {
    const savedBoards = JSON.parse(sessionStorage.getItem("boards")) || [];
    const foundBoard = savedBoards.find((b) => b.id === Number(boardId));

    if (foundBoard) {
      setBoard(foundBoard);
    } else {
      alert("Board không tồn tại!");
      navigate("/dashboard");
    }
  }, [boardId, navigate]);

  const updateBoardToStorage = (updatedBoard) => {
    const boards = JSON.parse(sessionStorage.getItem("boards")) || [];
    const index = boards.findIndex((b) => b.id === updatedBoard.id);
    boards[index] = updatedBoard;
    sessionStorage.setItem("boards", JSON.stringify(boards));
  };

  const handleAddList = async (e) => {
    if (!newListTitle.trim()) return;
    const newList = {
      title: newListTitle.trim(),
    };

    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:3000/api/boards/" + board.id + "/lists",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify(newList),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Lỗi thêm list mới");
        return;
      }
      const updatedBoard = {
        ...board,
        lists: [...board.lists, data],
      };

      setBoard(updatedBoard);
      updateBoardToStorage(updatedBoard);
      setNewListTitle("");
      setAddingList(false);
    } catch (err) {
      console.error("Lỗi thêm list mới:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameList = async (listId) => {
    console.log("Renaming list", listId, newListName);
    if (!newListName.trim()) return;

    setLoading(true);

    const bodyData = {
      title: newListName.trim(),
    };
    try {
      const res = await fetch(
        "http://localhost:3000/api/boards/" + board.id + "/lists/" + listId,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify(bodyData),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Lỗi thay doi ten");
        return;
      }
      const updatedLists = board.lists.map((list) =>
        list.id === listId ? data : list
      );
      const updatedBoard = {
        ...board,
        lists: updatedLists,
      };

      setBoard(updatedBoard);
      updateBoardToStorage(updatedBoard);
      setRenamingList(null);
      setNewListName("");
    } catch {
      console.error("Lỗi thêm list mới:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = (listId, cardTitle) => {
    if (!cardTitle.trim()) return alert("Tiêu đề thẻ không được để trống");

    const newCard = {
      id: Date.now(),
      title: cardTitle.trim()
    }

    const newList = board.lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          cards: [...list.cards, newCard]
        };
      }
      return list;
    })

    const newBoard = { ...board, lists: newList };
    setBoard(newBoard);
    updateBoardToStorage(newBoard);
    setNewCardTitle("");
    setAddingCard(prev => ({ ...prev, [listId]: false }))
  };

  if (!board) return <Loading />;

  return (
    <div>
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      {loading && <Loading />}

      <div className="board-page" style={{ background: board.color }}>
        <div className="board-container">

          {openPanel && openPanel !== "boards" && (
            <div className="side-panel">
              {openPanel === "inbox" && <InboxPanel board={board} />}
              {/* {openPanel === "calendar" && <CalendarPanel board={board} />}
              {openPanel === "dashboard" && <DashboardPanel board={board} />} */}
            </div>
          )}

          {openPanel === "boards" && (
            <BoardSwitcher
              isOpen={true}
              onClose={() => setOpenPanel(null)}
              onSelectBoard={(b) => {
                setBoard(b);
                setOpenPanel(null);
              }}
            />
          )}

          <div className={`board-main ${openPanel && openPanel !== "boards" ? "shrink" : ""}`}>
            <div className="board-header">
              <div>
                <h2>{board.name}</h2>
                <p className="description">{board.description}</p>
              </div>
            </div>

            {isCalendarMode ? (
              <Outlet context={{ board, setBoard }} />
            ) : (
              <>
                <DndProvider backend={HTML5Backend}>
                  <div className="lists-container">
                    {board.lists.map((list) => (
                      <ListColumn
                        key={list.id}
                        list={list}
                        index={board.lists.indexOf(list)}
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
                        handleAddCard={handleAddCard}
                        newCardTitle={newCardTitle}
                        setNewCardTitle={setNewCardTitle}
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
                      </div>
                    )}
                  </div>
                </DndProvider>

                {selectedCard && (
                  <CardModal
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>


        <BottomToolbar openPanel={openPanel} setOpenPanel={setOpenPanel} />
      </div>
    </div>
  );
};
export default BoardPage;
