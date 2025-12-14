import React, { use, useEffect, useState } from "react";
import { data, useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import SearchBar from "../components/SearchBar";
import socket from "../socket";

const Dashboard = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [description, setDescription] = useState("")
  const [newBoardColor, setNewBoardColor] = useState("");
  const [boardVisibility, setBoardVisibility] = useState("Private");
  const [availableColors, setAvailableColors] = useState([]);

  const token = sessionStorage.getItem("token");
  console.log("Token bên dashb", token)

  useEffect(() => {
    const handleBoardJoined = (board) => {
      console.log("Realtime board joined:", board);

      setBoards(prev => {
        const exists = prev.some(b => b.id === board.id);
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

    // Chưa chạy BackEnd thì dùng "Board.json"
    fetch("http://localhost:3000/api/boards", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("data tổng thể", data);
        const userBoards = data;
        setBoards(prev => {
          const map = new Map();

          [...prev, ...userBoards].forEach(b => {
            map.set(b.id, b);
          });

          const merged = Array.from(map.values());
          sessionStorage.setItem("boards", JSON.stringify(merged));
          return merged;
        });
      }).catch((err) => console.error("Lỗi tải board", err));

    fetch("colors.json")
      .then((res) => res.json())
      .then((data) => setAvailableColors(data.colors))
      .catch((err) => console.error("Lỗi tải colors", err));

  }, [navigate]);

  const handleBoardClick = (boardId) => {
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
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newBoard)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Lỗi tạo board");
        return;
      }

      setBoards(prev => {
        const updatedBoards = [...prev, data];
        sessionStorage.setItem("boards", JSON.stringify(updatedBoards));
        return updatedBoards;
      });

      setNewBoardName("");
      setNewBoardColor("");
      setShowForm(false);
    } catch (err) {
      alert(data.message || "Lỗi khi tạo Board")
    }
  };

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>📋 My Boards</h1>
          <div>
            <button className="dashboard-button" onClick={() => setShowForm(!showForm)}>
              + Thêm board
            </button>
          </div>
        </div>

        {showForm && (
          <>
            <div className="modal-overlay" onClick={() => setShowForm(false)}></div>
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
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                        border: newBoardColor === color ? "3px solid #000" : "2px solid #fff"
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="visibility-selection">
                <p>Chọn quyền truy cập:</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div
                    className={`visibility-option ${boardVisibility === "Private" ? "selected" : ""}`}
                    onClick={() => setBoardVisibility("Private")}
                  >
                    Private
                  </div>
                  <div
                    className={`visibility-option ${boardVisibility === "Workspace" ? "selected" : ""}`}
                    onClick={() => setBoardVisibility("Workspace")}
                  >
                    Workspace
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit">Thêm</button>
                <button type="button" onClick={() => setShowForm(false)}>Hủy</button>
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
      </div>
    </div>
  );
};

export default Dashboard;
