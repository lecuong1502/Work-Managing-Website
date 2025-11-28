import React, { useState, useEffect } from "react";
import "../styles/Calendar.css";

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? 0 : 30;
  return { hour, min };
});

const DAYS = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];

function getWeekStart(date = new Date()) {
  let d = new Date(date);
  let day = d.getDay();
  let diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toMinutes(t) {
  let [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function WeeklyCalendar() {
  const [events, setEvents] = useState(() => {
    const saved = sessionStorage.getItem("calendar-events");
    return saved ? JSON.parse(saved) : [];
  });

  const [currDate, setCurrDate] = useState(() => {
    const saved = sessionStorage.getItem("calendar-date");
    return saved ? new Date(saved) : new Date();
  });

  const [drag, setDrag] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [editBox, setEditBox] = useState(null);

  const weekStart = getWeekStart(currDate);
  const days = [...Array(7)].map((_, i) => {
    let d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  useEffect(() => {
    sessionStorage.setItem("calendar-events", JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    sessionStorage.setItem("calendar-date", currDate.toISOString());
  }, [currDate]);

  const next = () =>
    setCurrDate(
      new Date(
        currDate.getFullYear(),
        currDate.getMonth(),
        currDate.getDate() + 7
      )
    );

  const prev = () =>
    setCurrDate(
      new Date(
        currDate.getFullYear(),
        currDate.getMonth(),
        currDate.getDate() - 7
      )
    );

  const today = () => setCurrDate(new Date());

  const startCreate = (dIdx, idx) => {
    setDrag({ dIdx, idx });
    setDragEnd({ dIdx, idx });
  };

  const onDrag = (dIdx, idx) => {
    if (!drag) return;
    if (drag.dIdx !== dIdx) return;
    setDragEnd({ dIdx, idx });
  };

  const stopCreate = () => {
    if (!drag || !dragEnd) return;

    let day = drag.dIdx;
    let s = Math.min(drag.idx, dragEnd.idx);
    let e = Math.max(drag.idx, dragEnd.idx) + 1;

    let startHour = Math.floor(s / 2);
    let startMin = s % 2 === 0 ? 0 : 30;

    let endHour = Math.floor(e / 2);
    let endMin = e % 2 === 0 ? 0 : 30;

    let title = prompt("Tên lịch:");
    if (title) {
      let date = days[day].toISOString().split("T")[0];
      setEvents((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: title,
          date,
          start: `${pad(startHour)}:${pad(startMin)}`,
          end: `${pad(endHour)}:${pad(endMin)}`,
        },
      ]);
    }

    setDrag(null);
    setDragEnd(null);
  };

  const isDragCell = (dIdx, idx) => {
    if (!drag || !dragEnd) return false;
    if (drag.dIdx !== dIdx) return false;

    return (
      idx >= Math.min(drag.idx, dragEnd.idx) &&
      idx <= Math.max(drag.idx, dragEnd.idx)
    );
  };

  const saveEdit = () => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === editBox.id ? editBox : ev))
    );
    setEditBox(null);
  };

  const delEvent = () => {
    setEvents((prev) => prev.filter((ev) => ev.id !== editBox.id));
    setEditBox(null);
  };

  return (
    <div className="wcal">
      <div className="wcal-header">
        <button onClick={prev}>←</button>
        <button onClick={today}>Hôm nay</button>
        <button onClick={next}>→</button>
        <span>
          Tuần {days[0].getDate()} – {days[6].getDate()} /{" "}
          {days[0].getMonth() + 1}
        </span>
      </div>

      <div className="wcal-grid" onMouseUp={stopCreate}>
        <div className="wcal-hours">
          <div style={{ height: 52 }}></div>
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="wcal-hour">
              {pad(hour)}:00
            </div>
          ))}
        </div>

        <div className="wcal-days">
          <div className="wcal-days-header">
            {days.map((d, i) => (
              <div key={i} className="wcal-day-head">
                {DAYS[i]} <br />
                {d.getDate()}
              </div>
            ))}
          </div>

          <div className="wcal-days-body">
            {days.map((d, dIdx) => (
              <div key={dIdx} className="wcal-day-col">
                {TIMES.map((t, idx) => (
                  <div
                    key={idx}
                    className={`wcal-cell ${
                      isDragCell(dIdx, idx) ? "dragging" : ""
                    }`}
                    onMouseDown={() => startCreate(dIdx, idx)}
                    onMouseEnter={() => onDrag(dIdx, idx)}
                  ></div>
                ))}

                {events
                  .filter((ev) => ev.date === d.toISOString().split("T")[0])
                  .map((ev) => {
                    let startMin = toMinutes(ev.start);
                    let endMin = toMinutes(ev.end);

                    let top = startMin;
                    let height = endMin - startMin;
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
      {/* Chỉnh bảng lịch */}
      {editBox && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <h2>Chỉnh sửa lịch</h2>

            <div className="form-group">
              <label>Tiêu đề</label>
              <input
                type="text"
                value={editBox.name}
                onChange={(e) =>
                  setEditBox({ ...editBox, name: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bắt đầu</label>
                <input
                  type="time"
                  step="1800"
                  value={editBox.start}
                  onChange={(e) =>
                    setEditBox({ ...editBox, start: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Kết thúc</label>
                <input
                  type="time"
                  step="1800"
                  value={editBox.end}
                  onChange={(e) =>
                    setEditBox({ ...editBox, end: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="popup-actions">
              <button className="btn save" onClick={saveEdit}>
                Lưu
              </button>
              <button className="btn delete" onClick={delEvent}>
                Xoá
              </button>
              <button className="btn close" onClick={() => setEditBox(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
