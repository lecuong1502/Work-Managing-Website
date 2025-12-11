import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import SearchBar from "../components/SearchBar";
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

  const token = sessionStorage.getItem("token");
  useEffect(() => {
    const userId = Number(sessionStorage.getItem("userId"));
    const isLoggedIn = sessionStorage.getItem("loggedIn");
    if (!isLoggedIn) {
      navigate("/");
      return;
    }
    const existingBoards = JSON.parse(sessionStorage.getItem("boards")) || [];

    // Lấy danh sách board từ backend
    fetch("http://localhost:3000/api/boards", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const userBoards = data.filter((b) => Number(b.userId) === userId);
        const mergedBoards = userBoards.map((b) => {
          const old = existingBoards.find((ob) => ob.id === b.id);
          if (old && old.lists) {
            return { ...b, lists: old.lists };
          }
          return b;
        });

        setBoards(mergedBoards);
        sessionStorage.setItem("boards", JSON.stringify(mergedBoards));
      })
      .catch((err) => console.error("Lỗi tải board", err));
    fetch("colors.json")
      .then((res) => res.json())
      .then((data) => setAvailableColors(data.colors))
      .catch((err) => console.error("Lỗi tải colors", err));
  }, [navigate, token]);

  const handleBoardClick = (boardId) => {
    navigate(`/board/${boardId}`);
  };

  const handleAddBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim() || !newBoardColor) return;

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
      alert("Lỗi khi tạo Board");
    }
  };

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // dùng template -> tạo board + list + cảd
  const handleUseTemplate = async (template) => {
    if (!template) return;

    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("Bạn cần đăng nhập lại");
      return;
    }
    const safeJson = async (res) => {
      try {
        return await res.json();
      } catch (e) {
        console.error("Không parse được JSON:", e);
        return null;
      }
    };

    try {
      // 1. Tạo board mới
      const boardRes = await fetch("http://localhost:3000/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(template.board),
      });

      const boardData = await safeJson(boardRes);

      if (!boardRes.ok || !boardData) {
        alert((boardData && boardData.message) || "Lỗi tạo board từ template");
        return;
      }

      const fullBoard = { ...boardData, lists: [] };

      for (const listCfg of template.lists || []) {
        const listRes = await fetch(
          `http://localhost:3000/api/boards/${boardData.id}/lists`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: listCfg.title }),
          }
        );

        const listData = await safeJson(listRes);
        if (!listRes.ok || !listData) {
          console.error("Lỗi tạo list:", listData && listData.message);
          continue;
        }

        const fullList = { ...listData, cards: [] };

        for (const cardCfg of listCfg.cards || []) {
          const cardRes = await fetch(
            `http://localhost:3000/api/boards/${boardData.id}/lists/${listData.id}/cards`,
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
          const cardData = await safeJson(cardRes);
          if (!cardRes.ok || !cardData) {
            console.error("Lỗi tạo card:", cardData && cardData.message);
            continue;
          }

          fullList.cards.push(cardData);
        }

        fullBoard.lists.push(fullList);
      }
      // 3. Lưu vào state + sessionStorage
      setBoards((prev) => {
        const updated = [...prev, fullBoard];
        sessionStorage.setItem("boards", JSON.stringify(updated));
        return updated;
      });

      navigate(`/board/${fullBoard.id}`);
    } catch (err) {
      console.error("Lỗi không xác định khi sử dụng template:", err);
    }
  };

  // ================== JSX ==================
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
                  <h1>📋 My Boards</h1>
                  <div>
                    <button
                      className="dashboard-button"
                      onClick={() => setShowForm(!showForm)}
                    >
                      + Thêm board
                    </button>
                  </div>
                </div>

                {showForm && (
                  <>
                    <div
                      className="modal-overlay"
                      onClick={() => setShowForm(false)}
                    ></div>

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

                      <div>
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
                      style={{ background: board.color || "#fff" }}
                      onClick={() => handleBoardClick(board.id)}
                    >
                      {board.name}
                    </div>
                  ))}
                </div>

                {showUserManager && (
                  <div style={{ marginTop: "30px" }}>
                    <AdminUserPage />
                  </div>
                )}
              </>
            )}
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
                    <h1>📘 Các mẫu Business</h1>
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
                    <h1>🎨 Các mẫu Design</h1>
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

                {selectedCategory &&
                  selectedCategory !== "Business" &&
                  selectedCategory !== "Design" &&
                  !selectedTemplate && (
                    <>
                      <h1>Các mẫu {selectedCategory}</h1>
                      <p>Hiện tại chưa có template cho nhóm này.</p>
                    </>
                  )}

                {selectedTemplate && (
                  <div className="template-detail">
                    <button
                      className="back-button"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      ← Quay lại danh sách {selectedCategory}
                    </button>

                    <h1>{selectedTemplate.title}</h1>
                    <p className="template-author">
                      bởi {selectedTemplate.author}
                    </p>

                    <div className="template-detail-actions">
                      <button
                        className="use-template-btn"
                        onClick={() => handleUseTemplate(selectedTemplate)}
                      >
                        Sử dụng mẫu
                      </button>
                    </div>

                    <img
                      src={selectedTemplate.bigImage || selectedTemplate.image}
                      alt={selectedTemplate.title}
                      className="template-big-img"
                    />

                    <h2 style={{ marginTop: 20 }}>Về mẫu này</h2>
                    <p
                      className="template-description"
                      style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}
                    >
                      {selectedTemplate.description}
                    </p>
                  </div>
                )}
              </div>
            )}
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
