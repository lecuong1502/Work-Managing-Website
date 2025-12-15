import React from "react";
import "../styles/Sidebar.css";

const TEMPLATE_CATEGORIES = [
  { key: "Business", label: "Business" },
  { key: "Design", label: "Thiết kế" },
  { key: "Education", label: "Giáo dục" },
  { key: "Engineering", label: "Kỹ thuật" },
  { key: "Marketing", label: "Tiếp thị" },
];

const Sidebar = ({
  activeMenu,
  selectedCategory,
  onChangeMenu,
  onSelectCategory,
}) => {
  const isAdmin = sessionStorage.getItem("role") === "admin";

  return (
    <div className="sidebar">
      <h3 className="sidebar-title">TaskManager</h3>

      <ul className="sidebar-menu">
        <li
          className={`sidebar-item ${activeMenu === "boards" ? "active" : ""}`}
          onClick={() => onChangeMenu("boards")}
        >
          Bảng
        </li>

        <li
          className={`sidebar-item ${
            activeMenu === "templates" ? "active" : ""
          }`}
          onClick={() => onChangeMenu("templates")}
        >
          Mẫu
        </li>
        {activeMenu === "templates" && (
          <div className="sidebar-submenu">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className={
                  "sidebar-subitem" +
                  (selectedCategory === cat.key ? " active" : "")
                }
                onClick={() => onSelectCategory(cat.key)}
              >
                {cat.label}
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <li
            className={`sidebar-item ${
              activeMenu === "admin-users" ? "active" : ""
            }`}
            onClick={() => onChangeMenu("admin-users")}
            style={{ fontWeight: "bold", cursor: "pointer" }}
          >
            Quản lý user
          </li>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;
