import React, { useState } from "react";
// Import các thư viện ảnh lấy từ trang wed heroicons
import {
  InboxArrowDownIcon,
  Bars3Icon,
  CalendarDateRangeIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import BoardSwitcher from "./BoardSwitcher"; // chuyển bảng
import { useNavigate } from "react-router-dom";

const BottomToolbar = ({ boardId }) => {
  const [openSwitcher, setOpenSwitcher] = useState(false);
  const navigate = useNavigate();

  const toolbarStyle = {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "60%",
    background: "white",
    padding: "10px 16px",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: "14px 14px 0 0",
    boxShadow: "0 -2px 14px rgba(0,0,0,0.15)",
  };

  const btnStyle = {
    background: "#f4f5f7",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    transition: "0.2s",
    fontWeight: "bold",
  };

  const btnHover = (e) => (e.target.style.background = "#e3e4e8");
  const btnLeave = (e) => (e.target.style.background = "#f4f5f7");

  const handleSelectBoard = (board) => {
    navigate(`/board/${board.id}`);
    setOpenSwitcher(false);
  };

  return (
    <>
      <div style={toolbarStyle}>
        <button
          style={btnStyle}
          onMouseEnter={btnHover}
          onMouseLeave={btnLeave}
        >
          <InboxArrowDownIcon
            style={{ width: 20, height: 20, marginRight: 8 }}
          />
          Hộp thư đến
        </button>

        <button
          style={btnStyle}
          onMouseEnter={btnHover}
          onMouseLeave={btnLeave}
          onClick={() => navigate(`/board/${boardId}/calendar`)}
        >
          <CalendarDateRangeIcon
            style={{ width: 20, height: 20, marginRight: 8 }}
          />
          Trình lập kế hoạch
        </button>

        <button
          style={btnStyle}
          onMouseEnter={btnHover}
          onMouseLeave={btnLeave}
        >
          <DocumentChartBarIcon
            style={{ width: 20, height: 20, marginRight: 8 }}
          />
          Bảng thông tin
        </button>

        <button
          style={btnStyle}
          onMouseEnter={btnHover}
          onMouseLeave={btnLeave}
          onClick={() => setOpenSwitcher(true)}
        >
          <Bars3Icon style={{ width: 20, height: 20, marginRight: 8 }} />
          Chuyển đổi các bảng
        </button>
      </div>
      <BoardSwitcher
        isOpen={openSwitcher}
        onClose={() => setOpenSwitcher(false)}
        onSelectBoard={handleSelectBoard}
      />
    </>
  );
};

export default BottomToolbar;
