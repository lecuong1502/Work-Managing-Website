import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { BellIcon } from "@heroicons/react/24/outline";
import "../styles/Notification.css";

const API_URL = "http://localhost:3000";

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setNotifications(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const socket = io(API_URL, {
      auth: { token },
    });

    socket.on("notification_received", (newNoti) => {
      setNotifications((prev) => [newNoti, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  const markAsRead = async (id) => {
    const token = sessionStorage.getItem("token");

    await axios.put(
      `${API_URL}/api/notifications/${id}/read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notification-wrapper">
      <div className="notification-bell" onClick={() => setOpen(!open)}>
        <BellIcon className="bell-icon" />

        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">Thông báo</div>

          {loading && <div className="notification-empty">Đang tải...</div>}

          {!loading && notifications.length === 0 && (
            <div className="notification-empty">Không có thông báo</div>
          )}

          {!loading &&
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notification-item ${!n.isRead ? "unread" : ""}`}
                onClick={() => markAsRead(n.id)}
              >
                <img
                  src={n.sender?.avatar || "/assets/avatar.avif"}
                  className="notification-avatar"
                  alt="avatar"
                />

                <div className="notification-content">
                  <p className="notification-message">{n.message}</p>
                  <span className="notification-time">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Notification;
