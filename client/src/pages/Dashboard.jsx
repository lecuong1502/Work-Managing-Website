import React, { use, useEffect, useState } from "react";
import { data, useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import SearchBar from "../components/SearchBar";
import socket from "../socket";
import AdminUserPage from "../pages/AdminUserPage";
import Sidebar from "../components/Sidebar";
import { BUSINESS_TEMPLATES, DESIGN_TEMPLATES } from "./templates";
const Dashboard = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [description, setDescription] = useState("");
  const [newBoardColor, setNewBoardColor] = useState("");
  const [boardVisibility, setBoardVisibility] = useState("Private");
  const [availableColors, setAvailableColors] = useState([]);
  const [showUserManager, setShowUserManager] = useState(false);
  const [activeMenu, setActiveMenu] = useState("boards");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [recentBoards, setRecentBoards] = useState([]);

  const [inboxBoard, setInboxBoard] = useState(null);

  const token = sessionStorage.getItem("token");
  console.log("Token bên dashb", token);
  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem("recentBoards")) || [];
    setRecentBoards(saved);
  }, []);

  useEffect(() => {
    const handleBoardJoined = (board) => {
      console.log("Realtime board joined:", board);

      setBoards((prev) => {
        const exists = prev.some((b) => b.id === board.id);
        if (exists) return prev;

        const updated = [...prev, board];
        sessionStorage.setItem("boards", JSON.stringify(updated));
        return updated;
      });
    };

    socket.on("board_joined", handleBoardJoined);

    return () => {
      socket.off("board_joined", handleBoardJoined);
    };
  }, []);

  useEffect(() => {
    const userId = Number(sessionStorage.getItem("userId"));
    const isLoggedIn = sessionStorage.getItem("loggedIn");
    if (!isLoggedIn) {
      navigate("/");
      return;
    }

    fetch("http://localhost:3000/api/boards", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("data tổng thể", data);
        const userBoards = data;
        setBoards((prev) => {
          const map = new Map();

          [...prev, ...userBoards].forEach((b) => {
            map.set(b.id, b);
          });

          const merged = Array.from(map.values());
          sessionStorage.setItem(
            "inboxBoard",
            JSON.stringify(merged.find((b) => b.id === `inbox_${userId}`))
          );
          sessionStorage.setItem("boards", JSON.stringify(merged));
          return merged;
        });
      })
      .catch((err) => console.error("Lỗi tải board", err));

    fetch("colors.json")
      .then((res) => res.json())
      .then((data) => setAvailableColors(data.colors))
      .catch((err) => console.error("Lỗi tải colors", err));
  }, [navigate]);

  const handleBoardClick = (boardId) => {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return;

    let recent = JSON.parse(sessionStorage.getItem("recentBoards")) || [];

    // bỏ trùng
    recent = recent.filter((b) => b.id !== board.id);

    // thêm lên đầu
    recent.unshift({
      id: board.id,
      name: board.name,
      color: board.color,
    });

    // tối đa 5 board
    recent = recent.slice(0, 5);

    sessionStorage.setItem("recentBoards", JSON.stringify(recent));

    navigate(`/board/${boardId}`);
  };

  const userId = Number(sessionStorage.getItem("userId"));
  const handleAddBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim() || !newBoardColor) return;

    const userId = Number(sessionStorage.getItem("userId"));

    const newBoard = {
      name: newBoardName.trim(),
      description: description,
      color: newBoardColor,
      visibility: boardVisibility,
    };

    try {
      const res = await fetch("http://localhost:3000/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newBoard),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Lỗi tạo board");
        return;
      }

      setBoards((prev) => {
        const updatedBoards = [...prev, data];
        sessionStorage.setItem("boards", JSON.stringify(updatedBoards));
        return updatedBoards;
      });

      setNewBoardName("");
      setNewBoardColor("");
      setShowForm(false);
    } catch (err) {
      alert(data.message || "Lỗi khi tạo Board");
    }
  };

  const filteredBoards = boards.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      b.id !== `inbox_${userId}` //Ko hiện board inbox
  );
  // dùng template -> tạo board + list + cảd
  const handleUseTemplate = async (template) => {
    if (!template?.board) return;

    try {
      // 1. CREATE BOARD
      const boardRes = await fetch("http://localhost:3000/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: template.board.name || template.title,
          description: template.board.description || "",
          color:
            template.board.color || "linear-gradient(135deg, #667eea, #764ba2)",
          visibility: template.board.visibility || "Private",
        }),
      });

      const boardData = await boardRes.json();
      if (!boardRes.ok) {
        alert(boardData.message || "Không thể tạo board từ template");
        return;
      }

      const boardId = boardData.id;
      if (!boardId) {
        alert("Lỗi: Board ID không hợp lệ");
        return;
      }

      socket.emit("join-board", boardId);

      // 3. CREATE LISTS + CARDS
      for (const listCfg of template.lists || []) {
        const listRes = await fetch(
          `http://localhost:3000/api/boards/${boardId}/lists`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: listCfg.title }),
          }
        );

        const listData = await listRes.json();
        if (!listRes.ok) {
          console.error("❌ Tạo list thất bại:", listData);
          continue;
        }

        for (const cardCfg of listCfg.cards || []) {
          const cardRes = await fetch(
            `http://localhost:3000/api/boards/${boardId}/lists/${listData.id}/cards`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                title: cardCfg.title,
                description: cardCfg.description || "",
              }),
            }
          );

          if (!cardRes.ok) {
            const err = await cardRes.json();
            console.error(" Tạo card thất bại:", err);
          }
        }
      }
      setBoards((prev) => {
        const updatedBoards = [...prev, boardData];
        sessionStorage.setItem("boards", JSON.stringify(updatedBoards));
        return updatedBoards;
      });

      // 4. ĐỢI SOCKET SYNC RỒI MỚI NAVIGATE
      setTimeout(() => {
        navigate(`/board/${boardId}`);
      }, 300);
    } catch (err) {
      console.error("Template error:", err);
      alert("Có lỗi xảy ra khi dùng template");
    }
  };

  return (
    <>
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <div className="dashboard-page">
        <div className="dashboard-main">
          <Sidebar
            activeMenu={activeMenu}
            selectedCategory={selectedCategory}
            onChangeMenu={(menu) => {
              setActiveMenu(menu);
              setSelectedTemplate(null);
              if (menu !== "templates") setSelectedCategory(null);
            }}
            onSelectCategory={(catKey) => {
              setSelectedCategory(catKey);
              setSelectedTemplate(null);
            }}
          />

          <div className="dashboard">
            {activeMenu === "boards" && (
              <>
                <div className="dashboard-header">
                  <h1>My Boards</h1>
                  <button
                    className="dashboard-button"
                    onClick={() => setShowForm(!showForm)}
                  >
                    + Thêm board
                  </button>
                </div>

                {showForm && (
                  <>
                    <div
                      className="modal-overlay"
                      onClick={() => setShowForm(false)}
                    />

                    <form className="add-board-form" onSubmit={handleAddBoard}>
                      <input
                        type="text"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        placeholder="Tên board mới"
                        required
                      />

                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        required
                      />

                      <p>Background</p>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        {availableColors.map((color) => (
                          <div
                            key={color}
                            onClick={() => setNewBoardColor(color)}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "6px",
                              background: color,
                              cursor: "pointer",
                              border:
                                newBoardColor === color
                                  ? "3px solid #000"
                                  : "2px solid #fff",
                            }}
                          />
                        ))}
                      </div>

                      <div className="visibility-selection">
                        <p>Chọn quyền truy cập:</p>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <div
                            className={`visibility-option ${
                              boardVisibility === "Private" ? "selected" : ""
                            }`}
                            onClick={() => setBoardVisibility("Private")}
                          >
                            Private
                          </div>
                          <div
                            className={`visibility-option ${
                              boardVisibility === "Workspace" ? "selected" : ""
                            }`}
                            onClick={() => setBoardVisibility("Workspace")}
                          >
                            Workspace
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "15px",
                        }}
                      >
                        <button type="submit">Thêm</button>
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  </>
                )}

                <div className="board-list">
                  {filteredBoards.map((board) => (
                    <div
                      key={board.id}
                      className="board-card"
                      onClick={() => handleBoardClick(board.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div
                        className="board-cover"
                        style={{
                          background:
                            board.color ||
                            "linear-gradient(135deg,#7c7cff,#6a5acd)",
                        }}
                      />
                      <div className="board-title">{board.name}</div>
                    </div>
                  ))}
                </div>
                {/* ===== RECENTLY VIEWED BOARDS ===== */}
                {recentBoards.length > 0 && (
                  <div className="recent-section">
                    <h2 className="section-title"> Đã xem gần đây</h2>

                    <div className="recent-board-list">
                      {recentBoards.map((board) => (
                        <div
                          key={board.id}
                          className="board-card recent-board"
                          onClick={() => handleBoardClick(board.id)}
                        >
                          <div
                            className="board-cover"
                            style={{
                              background:
                                board.color ||
                                "linear-gradient(135deg,#7c7cff,#6a5acd)",
                            }}
                          />
                          <div className="board-title">{board.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showUserManager && (
                  <div style={{ marginTop: 30 }}>
                    <AdminUserPage />
                  </div>
                )}
              </>
            )}

            {/* mẫu bên sidebar*/}
            {activeMenu === "templates" && (
              <div className="templates-content">
                {!selectedCategory && (
                  <>
                    <h1>Mẫu</h1>
                    <p>
                      Hãy chọn một nhóm mẫu ở bên trái, ví dụ Việc kinh doanh.
                    </p>
                  </>
                )}

                {selectedCategory === "Business" && !selectedTemplate && (
                  <>
                    <h1>Các mẫu Business</h1>
                    <div className="template-grid">
                      {BUSINESS_TEMPLATES.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="template-card"
                          onClick={() => setSelectedTemplate(tpl)}
                        >
                          <img
                            src={tpl.image}
                            alt={tpl.title}
                            className="template-img"
                          />
                          <h3>{tpl.title}</h3>
                          <p className="template-author">bởi {tpl.author}</p>
                          <p className="template-short">{tpl.shortDesc}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {selectedCategory === "Design" && !selectedTemplate && (
                  <>
                    <h1>Các mẫu Design</h1>
                    <div className="template-grid">
                      {DESIGN_TEMPLATES.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="template-card"
                          onClick={() => setSelectedTemplate(tpl)}
                        >
                          <img
                            src={tpl.image}
                            alt={tpl.title}
                            className="template-img"
                          />
                          <h3>{tpl.title}</h3>
                          <p className="template-author">bởi {tpl.author}</p>
                          <p className="template-short">{tpl.shortDesc}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {selectedTemplate && (
                  <div className="template-detail">
                    <button
                      className="back-button"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      ← Quay lại
                    </button>

                    <h1>{selectedTemplate.title}</h1>
                    <p className="template-author">
                      bởi {selectedTemplate.author}
                    </p>

                    <button
                      className="use-template-btn"
                      onClick={() => handleUseTemplate(selectedTemplate)}
                    >
                      Sử dụng mẫu
                    </button>

                    <img
                      src={selectedTemplate.bigImage || selectedTemplate.image}
                      alt={selectedTemplate.title}
                      className="template-big-img"
                    />

                    <p
                      style={{
                        whiteSpace: "pre-line",
                        lineHeight: 1.6,
                      }}
                    >
                      {selectedTemplate.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* admin user*/}
            {activeMenu === "admin-users" && (
              <div style={{ padding: "20px" }}>
                <AdminUserPage />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
