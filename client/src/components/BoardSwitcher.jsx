import React, { useEffect, useState } from "react";
import "../styles/BoardSwitcher.css";

const BoardSwitcher = ({ isOpen, onClose, onSelectBoard }) => {
  const [boards, setBoards] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const saved = sessionStorage.getItem("boards");
    if (saved) {
      try {
        setBoards(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi parse boards:", e);
      }
    }
  }, [isOpen]);


  const filteredBoards = boards
    .filter((b) => !b.id.startsWith("inbox_"))
    .filter((b) =>
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

        <div className="board-content">
          <h4 className="board-switcher-section-title">Gần đây</h4>

          <div>
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                style={{ background: board.color }}
                onClick={() => onSelectBoard(board)}
                className="board-item"
              >
                {board.name}
              </div>
            ))}

            {filteredBoards.length === 0 && (
              <div className="board-switcher-empty">
                Không tìm thấy bảng nào
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BoardSwitcher;
