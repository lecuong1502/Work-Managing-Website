import React, { useEffect, useState } from "react";
import "../styles/BoardSwitcher.css";

export default function BoardSwitcher({ isOpen, onClose, onSelectBoard }) {
  const [boards, setBoards] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) fetchBoards();
  }, [isOpen]);

  const fetchBoards = async () => {
    try {
      const res = await fetch("/Board.json");
      const data = await res.json();
      const userId = Number(sessionStorage.getItem("userId"));
      const userBoards = data.boards.filter((b) => b.userId === userId);
      setBoards(userBoards);
    } catch (err) {
      console.error("Lỗi tải board ảo:", err);
    }
  };

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="board-switcher-overlay" onClick={onClose} />

      <div className="board-switcher-popup">
        <input
          type="text"
          placeholder="Tìm bảng của bạn"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="board-switcher-search"
        />

        <h4 className="board-switcher-section-title">Gần đây</h4>

        <div>
          {filteredBoards.map((board) => (
            <div
              key={board.id}
              onClick={() => onSelectBoard(board)}
              className="board-item"
            >
              {board.name}
            </div>
          ))}

          {filteredBoards.length === 0 && (
            <div className="board-switcher-empty">Không tìm thấy bảng nào</div>
          )}
        </div>
      </div>
    </>
  );
}
