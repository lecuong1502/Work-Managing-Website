import React, { useEffect, useState } from "react";

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.25)",
  zIndex: 10000,
};

const popupStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "500px",
  maxHeight: "80vh",
  overflowY: "auto",
  background: "white",
  padding: "16px",
  borderRadius: "14px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  zIndex: 10001,
};

export default function BoardSwitcher({ isOpen, onClose, onSelectBoard }) {
  const [boards, setBoards] = useState([]);
  const [search, setSearch] = useState("");

  //  gọi API ảo lấy board
  useEffect(() => {
    if (isOpen) fetchBoards();
  }, [isOpen]);

  const fetchBoards = async () => {
    try {
      const res = await fetch("/Board.json"); // lấy file từ public
      const data = await res.json();

      const userId = Number(sessionStorage.getItem("userId"));

      // Lọc board theo user đang đăng nhập
      const userBoards = data.boards.filter((b) => b.userId === userId);

      setBoards(userBoards);
    } catch (err) {
      console.error("Lỗi tải board ảo:", err);
    }
  };

  // Search
  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null; // nếu chưa mở thì không render gì

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />

      <div style={popupStyle}>
        {/* o tìm kiếm */}
        <input
          type="text"
          placeholder="Tìm bảng của bạn"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            marginBottom: "16px",
            fontSize: "16px",
          }}
        />
        <h4 style={{ marginBottom: "10px" }}>Gần đây</h4>

        <div>
          {filteredBoards.map((board) => (
            <div
              key={board.id}
              onClick={() => onSelectBoard(board)}
              style={{
                padding: "12px",
                background: "#f3f4f6",
                borderRadius: "8px",
                marginBottom: "8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {board.name}
            </div>
          ))}

          {filteredBoards.length === 0 && <div>Không tìm thấy bảng nào</div>}
        </div>
      </div>
    </>
  );
}
