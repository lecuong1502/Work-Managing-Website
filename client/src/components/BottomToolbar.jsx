import React from "react";
import {
  InboxArrowDownIcon,
  Bars3Icon,
  CalendarDateRangeIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import "../styles/BottomToolbar.css";

const BottomToolbar = ({ openPanel, setOpenPanel }) => {
  const handleToggle = (panel) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  return (
    <div className="bottom-toolbar">
      <button
        className={`bottom-btn ${openPanel === "inbox" ? "active" : ""}`}
        onClick={() => handleToggle("inbox")}
      >
        <InboxArrowDownIcon />
        Inbox
      </button>

      <button
        className={`bottom-btn ${openPanel === "calendar" ? "active" : ""}`}
        onClick={() => handleToggle("calendar")}
      >
        <CalendarDateRangeIcon />
        Calendar
      </button>

      <button
        className={`bottom-btn ${openPanel === "dashboard" ? "active" : ""}`}
      >
        <DocumentChartBarIcon />
        Board
      </button>

      <button
        className={`bottom-btn ${openPanel === "boards" ? "active" : ""}`}
        onClick={() => handleToggle("boards")}
      >
        <Bars3Icon />
        BoardSwitcher
      </button>
    </div>
  );
};

export default BottomToolbar;
