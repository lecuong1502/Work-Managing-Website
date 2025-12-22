import React, { useEffect, useState } from "react";
import "../styles/Calendar.css";
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? 0 : 30;
  return { hour, min };
});

const DAYS = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];

const pad = (n) => String(n).padStart(2, "0");

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

// COMPONENT
export default function CalendarPage() {
  const token = sessionStorage.getItem("token");

  const [events, setEvents] = useState([]);
  const [currDate, setCurrDate] = useState(new Date());
  const [drag, setDrag] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [editBox, setEditBox] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventInfo, setNewEventInfo] = useState(null);
  useEffect(() => {
    if (!token) return;

    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const mapped = Array.isArray(data)
          ? data.map((e) => ({
              id: e.event_id,
              name: e.title,
              date: e.start_time.split("T")[0],
              start: e.start_time.slice(11, 16),
              end: e.end_time.slice(11, 16),
            }))
          : [];
        setEvents(mapped);
      })
      .catch((err) => console.error("Lỗi lấy lịch:", err));
  }, [token]);

  // ======================
  // DATE HELPERS
  // ======================
  const weekStart = getWeekStart(currDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const nextWeek = () =>
    setCurrDate(new Date(currDate.setDate(currDate.getDate() + 7)));

  const prevWeek = () =>
    setCurrDate(new Date(currDate.setDate(currDate.getDate() - 7)));

  const goToday = () => setCurrDate(new Date());

  // ======================
  // CREATE EVENT (DRAG)
  // ======================
  const startCreate = (dIdx, idx) => {
    setDrag({ dIdx, idx });
    setDragEnd({ dIdx, idx });
  };

  const onDrag = (dIdx, idx) => {
    if (!drag || drag.dIdx !== dIdx) return;
    setDragEnd({ dIdx, idx });
  };

  const stopCreate = () => {
    if (!drag || !dragEnd) return;

    const dayIndex = drag.dIdx;
    const startIdx = Math.min(drag.idx, dragEnd.idx);
    const endIdx = Math.max(drag.idx, dragEnd.idx) + 1;

    const startHour = Math.floor(startIdx / 2);
    const startMin = startIdx % 2 === 0 ? 0 : 30;
    const endHour = Math.floor(endIdx / 2);
    const endMin = endIdx % 2 === 0 ? 0 : 30;

    setNewEventInfo({
      dayIndex,
      startHour,
      startMin,
      endHour,
      endMin,
    });

    setShowCreateModal(true);

    const date = days[dayIndex].toISOString().split("T")[0];

    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        start_time: `${date}T${pad(startHour)}:${pad(startMin)}:00.000Z`,
        end_time: `${date}T${pad(endHour)}:${pad(endMin)}:00.000Z`,
      }),
    })
      .then((res) => res.json())
      .then((e) => {
        setEvents((prev) => [
          ...prev,
          {
            id: e.event_id,
            name: e.title,
            date: e.start_time.split("T")[0],
            start: e.start_time.slice(11, 16),
            end: e.end_time.slice(11, 16),
          },
        ]);
      });

    setDrag(null);
    setDragEnd(null);
  };

  const isDragCell = (dIdx, idx) =>
    drag &&
    dragEnd &&
    drag.dIdx === dIdx &&
    idx >= Math.min(drag.idx, dragEnd.idx) &&
    idx <= Math.max(drag.idx, dragEnd.idx);

  // ======================
  // EDIT / DELETE
  // ======================
  const saveEdit = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/events/${editBox.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: editBox.name,
        start_time: `${editBox.date}T${editBox.start}:00.000Z`,
        end_time: `${editBox.date}T${editBox.end}:00.000Z`,
      }),
    }).then(() => {
      setEvents((prev) => prev.map((e) => (e.id === editBox.id ? editBox : e)));
      setEditBox(null);
    });
  };

  const deleteEvent = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/events/${editBox.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(() => {
      setEvents((prev) => prev.filter((e) => e.id !== editBox.id));
      setEditBox(null);
    });
  };

  // ======================
  // RENDER
  // ======================
  return (
    <div className="wcal">
      <div className="wcal-header">
        <button onClick={prevWeek}>←</button>
        <button onClick={goToday}>Hôm nay</button>
        <button onClick={nextWeek}>→</button>
        <span>
          Tuần {days[0].getDate()} – {days[6].getDate()} /{" "}
          {days[0].getMonth() + 1}
        </span>
      </div>

      <div className="wcal-grid" onMouseUp={stopCreate}>
        <div className="wcal-hours">
          <div style={{ height: 52 }} />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="wcal-hour">
              {pad(h)}:00
            </div>
          ))}
        </div>

        <div className="wcal-days">
          <div className="wcal-days-header">
            {days.map((d, i) => (
              <div key={i} className="wcal-day-head">
                {DAYS[i]} <br /> {d.getDate()}
              </div>
            ))}
          </div>

          <div className="wcal-days-body">
            {days.map((d, dIdx) => (
              <div key={dIdx} className="wcal-day-col">
                {TIMES.map((_, idx) => (
                  <div
                    key={idx}
                    className={`wcal-cell ${
                      isDragCell(dIdx, idx) ? "dragging" : ""
                    }`}
                    onMouseDown={() => startCreate(dIdx, idx)}
                    onMouseEnter={() => onDrag(dIdx, idx)}
                  />
                ))}

                {events
                  .filter((e) => e.date === d.toISOString().split("T")[0])
                  .map((e) => {
                    const top = toMinutes(e.start);
                    const height = toMinutes(e.end) - top;

                    return (
                      <div
                        key={e.id}
                        className="wcal-event"
                        style={{ top, height }}
                        onClick={() => setEditBox(e)}
                      >
                        <b>{e.name}</b>
                        <div>
                          {e.start} – {e.end}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showCreateModal && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <h2>Tạo sự kiện</h2>

            <input
              placeholder="Tên sự kiện"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => {
                  if (!newEventName.trim() || !newEventInfo) return;

                  const { dayIndex, startHour, startMin, endHour, endMin } =
                    newEventInfo;

                  const date = days[dayIndex].toISOString().split("T")[0];

                  fetch("http://localhost:3000/api/events", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      title: newEventName,
                      start_time: `${date}T${pad(startHour)}:${pad(
                        startMin
                      )}:00.000Z`,
                      end_time: `${date}T${pad(endHour)}:${pad(
                        endMin
                      )}:00.000Z`,
                    }),
                  })
                    .then((res) => res.json())
                    .then((e) => {
                      setEvents((prev) => [
                        ...prev,
                        {
                          id: e.event_id,
                          name: e.title,
                          date: e.start_time.split("T")[0],
                          start: e.start_time.slice(11, 16),
                          end: e.end_time.slice(11, 16),
                        },
                      ]);
                    });

                  setNewEventName("");
                  setNewEventInfo(null);
                  setShowCreateModal(false);
                }}
              >
                Lưu
              </button>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewEventName("");
                  setNewEventInfo(null);
                }}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {editBox && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <h2>Chỉnh sửa lịch</h2>

            <input
              value={editBox.name}
              onChange={(e) => setEditBox({ ...editBox, name: e.target.value })}
            />

            <input
              type="time"
              step="1800"
              value={editBox.start}
              onChange={(e) =>
                setEditBox({ ...editBox, start: e.target.value })
              }
            />

            <input
              type="time"
              step="1800"
              value={editBox.end}
              onChange={(e) => setEditBox({ ...editBox, end: e.target.value })}
            />

            <button onClick={saveEdit}>Lưu</button>
            <button onClick={deleteEvent}>Xoá</button>
            <button onClick={() => setEditBox(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
