import React, { useEffect, useState } from "react";
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
  const [selectedCard, setSelectedCard] = useState(null);
  const [newListTitle, setNewListTitle] = useState("");
  const [renamingList, setRenamingList] = useState(null);
  const [newListName, setNewListName] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const [inboxCards, setInboxCards] = useState([]);

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

  const getCurrentUser = () => {
    const userStr = sessionStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  };
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;

  const updateBoardToStorage = (updatedBoard) => {
    let boards = JSON.parse(sessionStorage.getItem("boards"));

    if (!Array.isArray(boards)) {
      boards = boards?.boards || [];
    }

    const index = boards.findIndex((b) => b.id === updatedBoard.id);

    if (index !== -1) {
      boards[index] = updatedBoard;
    }

    sessionStorage.setItem("boards", JSON.stringify(boards));
  };

  // Fetch Global Inbox
  const fetchInbox = async () => {
    if (!currentUserId) return;

    try {
      const token = sessionStorage.getItem("token");
      const inboxBoardId = `inbox_${currentUserId}`;

      // Gọi API lấy Board chi tiết với ID là inbox_USERID
      const res = await fetch(`http://localhost:3000/api/boards/${inboxBoardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const inboxBoard = await res.json();
        // Inbox Board chỉ có 1 list, lấy cards từ list đầu tiên
        const cards = inboxBoard.lists?.[0]?.cards || [];
        setInboxCards(cards);
      } else {
        console.warn("Chưa tìm thấy Inbox Board hoặc lỗi tải Inbox");
      }
    } catch (err) {
      console.error("Lỗi tải inbox:", err);
    }
  };

  // Gọi fetchInbox khi mount
  useEffect(() => {
    fetchInbox();
  }, []);

  // Add Card to Inbox
  const handleAddInboxCard = async (cardTitle) => {
    if (!cardTitle.trim()) return;

    const inboxBoardId = `inbox_${currentUserId}`;
    const inboxListId = `list_inbox_main_${currentUserId}`;

    const tempId = `temp_${Date.now()}`;
    const optimisticCard = {
        id: tempId,
        title: cardTitle,
        state: "Inbox",
        isGlobalInbox: true
    };

    setInboxCards((prev) => [optimisticCard, ...prev]);
    setNewCardTitle("");
    setAddingCard((prev) => ({ ...prev, inbox: false }));

    try {
      const token = sessionStorage.getItem("token");
      // Gọi API tạo card chuẩn vào List cụ thể của Inbox Board
      const res = await fetch(
        `http://localhost:3000/api/boards/${inboxBoardId}/lists/${inboxListId}/cards`, 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: cardTitle }),
        }
      );

      if (res.ok) {
        const newCard = await res.json();
        // Cập nhật lại card thật
        setInboxCards((prev) => 
            prev.map(c => c.id === tempId ? newCard : c)
        );
      } else {
        setInboxCards((prev) => prev.filter(c => c.id !== tempId));
        alert("Lỗi kết nối: Không thể thêm thẻ vào Inbox");
      }
    } catch (err) {
      console.error("Lỗi thêm thẻ vào inbox:", err);
      setInboxCards((prev) => prev.filter(c => c.id !== tempId));
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
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join-board", boardId);

    socket.on("board_updated", (updatedBoardData) => {
      if (updatedBoardData.id === Number(boardId)) {
        setBoard(updatedBoardData);
        updateBoardToStorage(updatedBoardData);
        fetchInbox();
      }
    });

    socket.on("notification_received", (noti) => {
      setToast({ message: noti.message, type: "info" });
    });

    return () => {
      socket.emit("leave-board", boardId);
      socket.off("board_updated");
      socket.off("board_member_added");
      socket.off("notification_received");
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

      setNewCardTitle("");
      setAddingCard((prev) => ({ ...prev, [listId]: false }));
    } catch {
      console.error("Lỗi thêm card mới:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCard = async (updatedCard, listId) => {
    setBoard((prevBoard) => {
      const newLists = prevBoard.lists.map((list) =>
        list.id === listId
          ? {
            ...list,
            cards: list.cards.map((c) =>
              c.id === updatedCard.id ? updatedCard : c
            ),
          }
          : list
      );

      const updatedBoard = { ...prevBoard, lists: newLists };
      updateBoardToStorage(updatedBoard);
      return updatedBoard;
    });
    try {
      await fetch(
        `http://localhost:3000/api/boards/${board.id}/lists/${listId}/cards/${updatedCard.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
          body: JSON.stringify(updatedCard),
        }
      );
    } catch (err) {
      console.error("Update card failed:", err);
    }
  };

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
                    <InboxPanel
                      inboxCards={inboxCards}
                      setInboxCards={setInboxCards}
                      board={board}
                      setBoard={setBoard}
                      addingCard={addingCard}
                      setAddingCard={setAddingCard}
                      newCardTitle={newCardTitle}
                      setNewCardTitle={setNewCardTitle}
                      handleAddCard={handleAddCard}
                      onAddInboxCard={handleAddInboxCard}
                      selectedCard={selectedCard}
                      setSelectedCard={setSelectedCard}
                    />
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
                          selectedCard={selectedCard}
                          setSelectedCard={setSelectedCard}
                          handleAddCard={handleAddCard}
                          newCardTitle={newCardTitle}
                          setNewCardTitle={setNewCardTitle}
                          onUpdateCard={handleUpdateCard}
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

                  {selectedCard && (
                    <CardModal
                      board={board}
                      card={selectedCard}
                      list={board.lists.find(
                        (l) => l.id === selectedCard.listId
                      )}
                      boardId={selectedCard.boardId}
                      listId={selectedCard.listId}
                      onUpdate={handleUpdateCard}
                      onClose={() => setSelectedCard(null)}
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
