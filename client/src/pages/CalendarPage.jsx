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

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export default function CalendarPage() {
  const token = sessionStorage.getItem("token");

  const [events, setEvents] = useState([]);
  const [currDate, setCurrDate] = useState(new Date());

  const [drag, setDrag] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  const [editBox, setEditBox] = useState(null);

  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:3000/api/events", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Fetch calendar failed");
        return res.json();
      })
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Lỗi lấy lịch:", err));
  }, [token]);

  const weekStart = getWeekStart(currDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const nextWeek = () =>
    setCurrDate(
      new Date(
        currDate.getFullYear(),
        currDate.getMonth(),
        currDate.getDate() + 7
      )
    );

  const prevWeek = () =>
    setCurrDate(
      new Date(
        currDate.getFullYear(),
        currDate.getMonth(),
        currDate.getDate() - 7
      )
    );

  const goToday = () => setCurrDate(new Date());

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

    const title = prompt("Tên sự kiện:");
    if (!title) {
      setDrag(null);
      setDragEnd(null);
      return;
    }

    const date = days[dayIndex].toISOString().split("T")[0];

    fetch("http://localhost:3000/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: title,
        date,
        start: `${pad(startHour)}:${pad(startMin)}`,
        end: `${pad(endHour)}:${pad(endMin)}`,
      }),
    })
      .then((res) => res.json())
      .then((newEvent) => {
        setEvents((prev) => [...prev, newEvent]);
      })
      .catch((err) => console.error("Lỗi tạo lịch:", err));

    setDrag(null);
    setDragEnd(null);
  };

  const isDragCell = (dIdx, idx) => {
    if (!drag || !dragEnd || drag.dIdx !== dIdx) return false;
    return (
      idx >= Math.min(drag.idx, dragEnd.idx) &&
      idx <= Math.max(drag.idx, dragEnd.idx)
    );
  };

  const saveEdit = () => {
    fetch(`http://localhost:3000/api/events/${editBox.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editBox),
    }).then(() => {
      setEvents((prev) =>
        prev.map((ev) => (ev.id === editBox.id ? editBox : ev))
      );
      setEditBox(null);
    });
  };

  const deleteEvent = () => {
    fetch(`http://localhost:3000/api/events/${editBox.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(() => {
      setEvents((prev) => prev.filter((ev) => ev.id !== editBox.id));
      setEditBox(null);
    });
  };

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
                  .filter((ev) => ev.date === d.toISOString().split("T")[0])
                  .map((ev) => {
                    const top = toMinutes(ev.start);
                    const height = toMinutes(ev.end) - top;

                    return (
                      <div
                        key={ev.id}
                        className="wcal-event"
                        style={{ top: `${top}px`, height: `${height}px` }}
                        onClick={() => setEditBox(ev)}
                      >
                        <b>{ev.name}</b>
                        <div>
                          {ev.start} – {ev.end}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

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
