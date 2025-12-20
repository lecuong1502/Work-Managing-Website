import React, { useEffect, useState, useMemo } from "react";
import {
  useParams,
  useNavigate,
  Outlet,
  useLocation,
  data,
} from "react-router-dom";
import "../styles/BoardPage.css";
import { UserPlusIcon, LockClosedIcon, UsersIcon } from "@heroicons/react/24/solid";
import SearchBar from "../components/SearchBar";
import CardModal from "../components/CardModal";
import ListColumn from "../components/ListColumn";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import BottomToolbar from "../components/BottomToolbar";
import Loading from "../components/LoadingOverlay";
import InboxPanel from "../components/InboxPanel";
import BoardSwitcher from "../components/BoardSwitcher";
import Calendar from "../pages/CalendarPage";
import Toast from "../components/Toast";
import socket from "../socket";


const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  const [board, setBoard] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [addingCard, setAddingCard] = useState({});
  const [addingList, setAddingList] = useState(false);

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);


  const [newListTitle, setNewListTitle] = useState("");
  const [renamingList, setRenamingList] = useState(null);
  const [newListName, setNewListName] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // const [inboxCards, setInboxCards] = useState([]);
  const [boards, setBoards] = useState(JSON.parse(sessionStorage.getItem("boards")) || []);
  const [inboxBoard, setInboxBoard] = useState(null);

  const currentUser = useMemo(() => {
    const userData = sessionStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  }, []);


  const updateBoardState = (boardId, updatedBoardData) => {
    // 1. Cập nhật state Boards tổng quát
    setBoards(prev => {
      const newBoards = prev.map(b => b.id === boardId ? updatedBoardData : b);
      sessionStorage.setItem("boards", JSON.stringify(newBoards));
      return newBoards;
    });

    // 2. Nếu board đang được cập nhật là Inbox, cập nhật luôn state inboxBoard
    if (String(boardId).startsWith("inbox_")) {
      setInboxBoard(updatedBoardData);
      sessionStorage.setItem("inboxBoard", JSON.stringify(updatedBoardData));
    }

    // 3. Nếu board đang được cập nhật là Board hiện tại (đang mở)
    if (board && board.id === boardId) {
      setBoard(updatedBoardData);
    }
  };

  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const [openPanel, setOpenPanel] = useState({
    inbox: false,
    calendar: false,
    // board: false,
    switcher: false,
  });

  const [showShareForm, setShowShareForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const openCount = Object.values(openPanel).filter(Boolean).length;

  const isCalendarMode = location.pathname.includes("/calendar");

  const currentUserId = sessionStorage.getItem("userId");


  // console.log("Current User ID:", currentUserId);

  const updateBoardToStorage = (boardId, updatedBoard) => {
    let boards = JSON.parse(sessionStorage.getItem("boards"));

    if (!Array.isArray(boards)) {
      boards = boards?.boards || [];
    }

    const index = boards.findIndex(b => b?.id === boardId);
    if (index !== -1) {
      boards[index] = updatedBoard;
    }

    sessionStorage.setItem("boards", JSON.stringify(boards));
    socket.emit("board_updated", updatedBoard);
  };



  // Fetch Global Inbox
  const fetchInbox = async () => {
    if (!currentUserId) {
      console.error("Không tìm thấy Current User ID");
      return;
    }
    const token = sessionStorage.getItem("token");
    const inboxBoardId = `inbox_${currentUserId}`;

    try {
      const res = await fetch(`http://localhost:3000/api/boards/${inboxBoardId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Inbox Data:", data); // Kiểm tra xem data có lists không
        setInboxBoard(data);
        updateBoardState(inboxBoardId, data);
      } else {
        console.error("Lỗi API Inbox:", res.status);
      }
    } catch (err) {
      console.error("Lỗi kết nối Inbox:", err);
    }
  };


  useEffect(() => {
    fetchInbox();
  }, [openPanel.inbox, currentUserId]);

  // Add Card to Inbox
  const handleAddInboxCard = async (listId, cardTitle) => {
    if (!cardTitle.trim() || !inboxBoard) return;

    const tempId = `temp_${Date.now()}`;

    const optimisticCard = {
      id: tempId,
      title: cardTitle,
      state: "Inbox",
      isGlobalInbox: true,
    };

    //Optimistic update – CẬP NHẬT TRỰC TIẾP inboxBoard
    setInboxBoard(prev => ({
      ...prev,
      lists: prev.lists.map(list =>
        list.id === listId
          ? { ...list, cards: [optimisticCard, ...list.cards] }
          : list
      ),
    }));

    setNewCardTitle("");
    setAddingCard(prev => ({ ...prev, inbox: false }));

    try {
      const token = sessionStorage.getItem("token");

      const res = await fetch(
        `http://localhost:3000/api/boards/${inboxBoard.id}/lists/${listId}/cards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: cardTitle }),
        }
      );

      if (!res.ok) throw new Error("Create card failed");

      const newCard = await res.json();

      //Replace temp card bằng card thật
      setInboxBoard(prev => ({
        ...prev,
        lists: prev.lists.map(list =>
          list.id === listId
            ? {
              ...list,
              cards: list.cards.map(c =>
                c.id === tempId ? newCard : c
              ),
            }
            : list
        ),
      }));
    } catch (err) {
      console.error("Lỗi thêm thẻ vào inbox:", err);

      //Rollback optimistic
      setInboxBoard(prev => ({
        ...prev,
        lists: prev.lists.map(list =>
          list.id === listId
            ? {
              ...list,
              cards: list.cards.filter(c => c.id !== tempId),
            }
            : list
        ),
      }));
    }
  };

  // Sửa lại useEffect lấy dữ liệu Board
  useEffect(() => {
    const fetchBoardData = async () => {
      // 1. Thử lấy từ cache để hiển thị ngay lập tức (tránh màn hình trắng)
      try {
        const savedBoardsData = JSON.parse(sessionStorage.getItem("boards"));
        let savedBoards = [];
        if (Array.isArray(savedBoardsData)) {
          savedBoards = savedBoardsData;
        } else if (savedBoardsData?.boards && Array.isArray(savedBoardsData.boards)) {
          savedBoards = savedBoardsData.boards;
        }

        const cachedBoard = savedBoards.find((b) => b.id === Number(boardId));
        if (cachedBoard) {
          setBoard(cachedBoard); // Hiện tạm data cũ trong khi chờ server
        }
      } catch (e) {
        console.log("Lỗi đọc cache, sẽ fetch từ server...");
      }

      // 2. GỌI API LẤY DỮ LIỆU MỚI NHẤT TỪ SERVER (QUAN TRỌNG)
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(`http://localhost:3000/api/boards/${boardId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const serverBoardData = await res.json();
          setBoard(serverBoardData);
          updateBoardToStorage(serverBoardData); // Cập nhật lại cache cho lần sau
        } else {
          // Xử lý lỗi nếu không có quyền hoặc board không tồn tại
          if (res.status === 403) {
            alert("Bạn không có quyền truy cập vào Board này!");
            navigate("/dashboard");
          } else if (res.status === 404) {
            alert("Board không tồn tại!");
            navigate("/dashboard");
          } else {
            console.error("Lỗi tải board:", res.statusText);
          }
        }
      } catch (error) {
        console.error("Lỗi kết nối server:", error);
      }
    };

    fetchBoardData();
  }, [boardId, navigate]);

  // Socket.io
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.emit("join-board", boardId);

    // Khi có bất kỳ ai cập nhật toàn bộ board
    socket.on("board_updated", (updatedBoardData) => {
      if (String(updatedBoardData.id) === String(boardId)) {
        setBoard(updatedBoardData);
        updateBoardToStorage(updatedBoardData);
      }
    });

    // Khi có người di chuyển thẻ hoặc list (Realtime DND)
    socket.on("board_moved", (updatedBoardData) => {
      setBoard(updatedBoardData);
    });

    // Khi có người sửa chi tiết 1 card cụ thể
    socket.on("CARD_UPDATED", ({ listId, card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newLists = prev.lists.map((l) =>
          l.id === listId
            ? { ...l, cards: l.cards.map((c) => (c.id === card.id ? card : c)) }
            : l
        );
        return { ...prev, lists: newLists };
      });
    });

    return () => {
      socket.emit("leave-board", boardId);
      socket.off("board_updated");
      socket.off("board_moved");
      socket.off("CARD_UPDATED");
    };
  }, [boardId]);

  const handleBoardClick = (boardId) => {
    navigate(`/board/${boardId}`);
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
      socket.emit("board_updated", updatedBoard);
      setRenamingList(null);
      setNewListName("");
    } catch {
      console.error("Lỗi thêm list mới:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (listId, cardTitle) => {
    if (!cardTitle.trim()) return alert("Tiêu đề thẻ không được để trống");

    const bodyData = {
      title: cardTitle.trim(),
    };

    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3000/api/boards/" +
        board.id +
        "/lists/" +
        listId +
        "/cards",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify(bodyData),
        }
      );

      const data = await res.json();
      const newList = board.lists.map((list) => {
        if (list.id === listId) {
          return {
            ...list,
            cards: [...list.cards, data],
          };
        }
        return list;
      });

      const newBoard = { ...board, lists: newList };

      setBoard(newBoard);
      updateBoardToStorage(newBoard);
      socket.emit("board_updated", newBoard);

      setNewCardTitle("");
      setAddingCard((prev) => ({ ...prev, [listId]: false }));
    } catch {
      console.error("Lỗi thêm card mới:", err);
    } finally {
      setLoading(false);
    }
  };


  ///Cập nhật card


  const activeBoard = useMemo(() => {
    if (!selectedBoardId) return null;


    if (String(selectedBoardId).startsWith("inbox_")) {
      return inboxBoard;
    }

    return board;
  }, [selectedBoardId, board, inboxBoard]);

  const selectedCard = useMemo(() => {
    return activeBoard?.lists
      ?.flatMap(l => l.cards)
      ?.find(c => c.id === selectedCardId);
  }, [activeBoard, selectedCardId]);

  const selectedList = useMemo(() => {
    return activeBoard?.lists?.find(l => l.id === selectedListId);
  }, [activeBoard, selectedListId]);

  const updateCardInBoard = (prevBoard, updatedCard, listId) => {
    return {
      ...prevBoard,
      lists: prevBoard.lists.map(l =>
        l.id === listId
          ? {
            ...l,
            cards: l.cards.map(c =>
              c.id === updatedCard.id ? updatedCard : c
            ),
          }
          : l
      ),
    };
  };




  const handleUpdateCard = async (updatedCard, listId, boardId) => {
    // 1. Optimistic UI
    if (boardId === inboxBoard.id) {
      setInboxBoard(prev => updateCardInBoard(prev, updatedCard, listId));
    } else {
      setBoard(prev => updateCardInBoard(prev, updatedCard, listId));
    }

    // 2. Persist
    updateBoardToStorage(boardId,
      boardId === inboxBoard.id
        ? updateCardInBoard(inboxBoard, updatedCard, listId)
        : updateCardInBoard(board, updatedCard, listId)
    );

    // 3. API
    await fetch(
      `http://localhost:3000/api/boards/${boardId}/lists/${listId}/cards/${updatedCard.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify(updatedCard),
      }
    );
  };


  ///đông bộ card khi có sự kiện từ server
  useEffect(() => {
    const handler = ({ listId, card }) => {
      setBoard((prev) => {
        const lists = prev.lists.map((l) =>
          l.id === listId
            ? {
              ...l,
              cards: l.cards.map((c) =>
                c.id === card.id ? card : c
              ),
            }
            : l
        );
        return { ...prev, lists };
      });
    };

    socket.on("CARD_UPDATED", handler);

    return () => socket.off("CARD_UPDATED", handler);
  }, []);



  const handleAddMember = async () => {
    if (!email) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/boards/add-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          boardId: board.id,
          memberEmail: email,
          role: role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.message, type: "error" });
      } else {
        setToast({ message: "Thêm thành viên thành công", type: "success" });
        setEmail("");
        setShowShareForm(false);

        if (data.board) {
          setBoard(data.board);
          updateBoardToStorage(data.board);
          socket.emit("board_updated", data.board);
        } else {
          setBoard((prev) => ({
            ...prev,
            members: [...(prev.members || []), data.member],
          }));
        }
      }
    } catch (err) {
      console.log(data.message);
      setToast({ message: "Lỗi kết nối server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    console.log("Change role", memberId, newRole);
  };

  const handleChangeVisibility = async (newVisibility) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/boards/${board.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: board.name,
            visibility: newVisibility,
          }),
        }
      );

      const updatedBoard = await res.json();

      setBoard(updatedBoard);
      updateBoardToStorage(updatedBoard);

      setShowVisibilityMenu(false);
    } catch (err) {
      console.error("Lỗi đổi visibility:", err);
    }
  };

  //Drag drop list

  const moveList = (fromIndex, toIndex) => {
    setBoard((prev) => {
      const newLists = [...prev.lists];
      const [moved] = newLists.splice(fromIndex, 1);
      newLists.splice(toIndex, 0, moved);

      const updated = { ...prev, lists: newLists };
      sessionStorage.setItem("boards", JSON.stringify(updated));
      return updated;
    });

    fetch("http://localhost:3000/api/boards/lists/move", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        sourceBoardId: board.id,
        destBoardId: board.id,
        listId: board.lists[fromIndex].id,
        index: toIndex,
      }),
    });
  };


  const handleMoveCardOutOfInbox = (cardId, inboxListId) => {
    setInboxBoard(prev => ({
      ...prev,
      lists: prev.lists.map(l =>
        l.id === inboxListId
          ? { ...l, cards: l.cards.filter(c => c.id !== cardId) }
          : l
      )
    }));
  };




  if (!board) return <Loading />;

  return (
    <div className="board-wrapper">
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      {loading && <Loading />}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="board-page" style={{ background: board.color }}>
        <div className="board-container">
          <DndProvider backend={HTML5Backend}>
            {openPanel.inbox && (
              <div className="side-panel inbox-panel">
                {openPanel.inbox && (
                  <div className="side-panel-content">
                    {inboxBoard && inboxBoard.lists ? (<InboxPanel
                      inboxBoard={inboxBoard}
                      setInboxBoard={(updated) => updateBoardState(inboxBoard.id, updated)}
                      addingCard={addingCard}
                      setAddingCard={setAddingCard}
                      newCardTitle={newCardTitle}
                      setNewCardTitle={setNewCardTitle}
                      onAddInboxCard={handleAddInboxCard}
                      selectedCardId={selectedCardId}
                      setSelectedCardId={setSelectedCardId}
                      selectedListId={selectedListId}
                      setSelectedListId={setSelectedListId}
                      selectedBoardId={selectedBoardId}
                      setSelectedBoardId={setSelectedBoardId}
                      destBoardId={board.id}
                    />) : (
                      <Loading />
                    )}

                  </div>
                )}
              </div>
            )}

            {openPanel.calendar && (
              <div className="side-panel calendar-panel">
                {openPanel.calendar && (
                  <div className="side-panel-content">
                    <Calendar />
                  </div>
                )}
              </div>
            )}

            {openPanel.switcher && (
              <BoardSwitcher
                isOpen={true}
                onClose={() =>
                  setOpenPanel((prev) => ({
                    ...prev,
                    switcher: false,
                  }))
                }
                onSelectBoard={(b) => {
                  handleBoardClick(b.id);
                  setOpenPanel((prev) => ({
                    ...prev,
                    switcher: false,
                  }));
                }}
              />
            )}

            <div className={`board-main panel-${openCount}`}>
              <div className="board-header">
                <div>
                  <h2>{board.name}</h2>
                  <p className="description">{board.description}</p>
                </div>

                <div className="board-header-actions">

                  <div style={{ position: "relative" }}>
                    <button
                      className="change-visibility-btn"
                      onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                    >
                      {board.visibility === "Workspace" ? (
                        <>
                          <UsersIcon className="icon" />
                          Workspace
                        </>
                      ) : (
                        <>
                          <LockClosedIcon className="icon" />
                          Private
                        </>
                      )}
                    </button>

                    {showVisibilityMenu && (
                      <div className="visibility-menu">
                        <div onClick={() => handleChangeVisibility("Workspace")}>
                          <UsersIcon className="icon" />
                          Workspace
                        </div>
                        <div onClick={() => handleChangeVisibility("Private")}>
                          <LockClosedIcon className="icon" />
                          Private
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ position: "relative" }}>
                    <button
                      className="add-member-btn"
                      onClick={() => setShowShareForm(!showShareForm)}
                    >
                      <UserPlusIcon className="icon" />
                      Add Member
                    </button>

                    {showShareForm && (
                      <div className="share-board-popup">
                        <div className="share-header">Share board</div>
                        <div className="share-input-row">
                          <input
                            type="email"
                            placeholder="Email address or name"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />

                          <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="share-role-select"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>

                          <button onClick={handleAddMember} disabled={loading}>
                            {loading ? "Adding..." : "Share"}
                          </button>
                        </div>


                        <div className="share-members-section">
                          <div className="share-section-title">Board members</div>

                          {board?.members?.map((member) => (
                            <div key={member.id} className="share-member-item">
                              <div className="share-member-avatar">
                                {member.name?.charAt(0)?.toUpperCase()}
                              </div>

                              <div className="share-member-info">
                                <div className="share-member-name">
                                  {member.name}
                                </div>
                                <div className="share-member-email">
                                  {member.email}
                                </div>
                              </div>

                              <select
                                className="share-role-select"
                                value={member.role}
                                onChange={(e) =>
                                  handleChangeRole(member.id, e.target.value)
                                }
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="guest">Guest</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isCalendarMode ? (
                <Outlet context={{ board, setBoard }} />
              ) : (
                <>
                  <div className="lists-container">
                    {board.lists
                      .filter((l) => l.id !== "inbox")
                      .map((list) => (
                        <ListColumn
                          key={list.id}
                          list={list}
                          index={board.lists.indexOf(list)}
                          moveList={moveList}
                          board={board}
                          setBoard={setBoard}
                          renamingList={renamingList}
                          setRenamingList={setRenamingList}
                          newListName={newListName}
                          setNewListName={setNewListName}
                          handleRenameList={handleRenameList}
                          setAddingCard={setAddingCard}
                          addingCard={addingCard}
                          selectedCardId={selectedCardId}
                          setSelectedCardId={setSelectedCardId}
                          selectedListId={selectedListId}
                          setSelectedListId={setSelectedListId}
                          selectedBoardId={selectedBoardId}
                          setSelectedBoardId={setSelectedBoardId}
                          handleAddCard={handleAddCard}
                          newCardTitle={newCardTitle}
                          setNewCardTitle={setNewCardTitle}
                          onUpdateCard={handleUpdateCard}
                          onMoveCardOutOfInbox={handleMoveCardOutOfInbox}
                          inboxBoardId={inboxBoard?.id}
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
                        <button onClick={() => setAddingList(false)}>
                          Cancel
                        </button>
                        <button onClick={handleAddList}>Add</button>
                      </div>
                    ) : (
                      <div
                        className="add-list"
                        onClick={() => setAddingList(true)}
                      >
                        + Add another list
                      </div>
                    )}
                  </div>

                  {selectedCard && selectedList && (
                    <CardModal
                      board={activeBoard}
                      card={selectedCard}
                      list={selectedList}
                      boardId={activeBoard.id}
                      listId={selectedListId}
                      onUpdate={handleUpdateCard}
                      currentUser={currentUser}
                      onClose={() => {
                        setSelectedCardId(null);
                        setSelectedListId(null);
                      }}
                    />
                  )}

                </>
              )}
            </div>
          </DndProvider>
        </div>

        <BottomToolbar openPanel={openPanel} setOpenPanel={setOpenPanel} />
      </div>
    </div>
  );
};
export default BoardPage;
