import React, { useEffect } from "react";
import "../styles/CardModal.css"
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState } from "react";


const CardModal = ({ card, list, boardId, listId, onUpdate, onClose }) => {
    if (!card) return null;
    console.log("CardModal:  ", boardId, listId);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [date, setDate] = useState(card?.dueDate ? new Date(card.dueDate) : null);
    const [showLabelPopup, setShowLabelPopup] = useState(false);
    const [allLabels, setAllLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(true);

    const [selectedLabels, setSelectedLabels] = useState(card.labels || []);

    const [editDescription, setEditDescription] = useState(false);
    const [editedDesciption, setEditedDesciption] = useState(card.description || "");

    const [editTitle, setEditTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(card.title || "");


    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;

        // Thêm tin nhắn test local
        setMessages(prev => [...prev, {
            user: "You",
            text: input
        }]);

        setInput("");
    };


    useEffect(() => {
        fetch("/labels.json")
            .then((res) => res.json())
            .then((data) => setAllLabels(data.labels))
            .catch((err) => console.error("Lỗi load labels", err))
            .finally(() => setLoadingLabels(false))
    }, [])

    const toggleLabel = (label) => {
        const exists = selectedLabels.some(l => l.id === label.id);

        const updated = exists
            ? selectedLabels.filter(l => l.id !== label.id)
            : [...selectedLabels, label];

        setSelectedLabels(updated);
    };

    const formatDate = (d) => d ? d.toLocaleDateString() : null;

    const handleSaveDate = () => {
        const updatedCard = {
            ...card,
            labels: selectedLabels,
            description: editedDesciption,
            dueDate: formatDate(date)
        };
        onUpdate(updatedCard, listId);
        setShowDatePicker(false);
    };

    const handleSaveDescription = () => {
        const updatedCard = {
            ...card,
            labels: selectedLabels,
            description: editedDesciption,
            dueDate: formatDate(date)
        };
        onUpdate(updatedCard, listId);
        setEditDescription(false);
    }


    const handleClear = () => {
        setDate(null);
        onUpdate({ ...card, labels: selectedLabels, dueDate: null }, listId);
        setShowDatePicker(false);
    };

    const handleClose = async () => {
        const updatedCard = { ...card, labels: selectedLabels, description: editedDesciption, dueDate: formatDate(date) };
        onUpdate(updatedCard, listId);
        onClose();

    };

    const handleOverlayClose = async () => {
        const updatedCard = {
            ...card,
            title: editedTitle,
            labels: selectedLabels,
            description: editedDesciption,
            dueDate: formatDate(date)
        };
        onUpdate(updatedCard, listId);
        onClose();
    };

    const handleSaveTitle = async () => {
        setEditTitle(false);

        const updatedCard = {
            ...card,
            title: editedTitle,
            labels: selectedLabels,
            description: editedDesciption,
            dueDate: formatDate(date)
        };
        onUpdate(updatedCard, listId);
    };


    return (
        <div className="modal-overlay" onClick={handleOverlayClose}>
            <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
                <div className="header-listName">
                    <h1>{list.title}</h1>
                    <button className="close-x" onClick={handleClose}>✕</button>
                </div>
                <div className="modal-body-wrapper">
                    <div className="modal-left">
                        <div className="modal-content">
                            {!editTitle ? (
                                <div className="modal-header" >
                                    <h2 onClick={() => setEditTitle(true)}>{editedTitle}</h2>
                                </div>
                            ) : (
                                <div className="modal-header">
                                    <input
                                        value={editedTitle}
                                        className="modal-title-input"
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        autoFocus
                                        onBlur={handleSaveTitle}
                                    />
                                </div>
                            )}


                            <div className="modal-body">
                                {selectedLabels.length > 0 && (
                                    <div className="labels">
                                        {selectedLabels.map(label => (
                                            <span
                                                key={label.id}
                                                className="label"
                                                style={{
                                                    backgroundColor: label.color,
                                                    color: "white",
                                                    padding: "5px 10px",
                                                    borderRadius: "5px",
                                                    marginRight: "6px"
                                                }}
                                            >
                                                {label.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="feature">
                                    <button>+ Add</button>
                                    <button onClick={() => setShowLabelPopup(!showLabelPopup)}>Label</button>
                                    <button><img src="/assets/check-circle.svg" /> Checklist</button>
                                    <button><img src="/assets/paperclip.svg" /> Attachment</button>
                                    <button onClick={() => setShowDatePicker(!showDatePicker)}>Due Date</button>
                                </div>

                                {date && <p><strong>Due:</strong> {formatDate(date)}</p>}

                                {!editDescription ? (
                                    <div className="modal-description">
                                        {editedDesciption || card.description}
                                        <button className="editDescription" onClick={() => setEditDescription(true)}>Edit</button>
                                    </div>
                                ) : (
                                    <div className="modal-description">
                                        <textarea
                                            value={editedDesciption}
                                            onChange={(e) => setEditedDesciption(e.target.value)}
                                        />
                                        <button className="saveDescription" onClick={handleSaveDescription}>Save</button>
                                        <button className="cancelDescription" onClick={() => {
                                            setEditDescription(false);
                                            setEditedDesciption(card.description);
                                        }}>Cancel</button>
                                    </div>
                                )}


                            </div>
                        </div>
                    </div>


                    <div className="modal-right">
                        <h3 className="activity-title">Comments and activity</h3>

                        <input
                            className="comment-input"
                            placeholder="Write a comment..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />

                        <div className="activity-list">
                            {messages.map((m, idx) => (
                                <div key={idx} className="activity-item">
                                    <div className="avatar">{m.user[0]}</div>
                                    <div className="activity-content">
                                        <div className="activity-header">
                                            <span className="activity-user">{m.user}</span>
                                            <span className="activity-time">just now</span>
                                        </div>
                                        <div className="activity-text">{m.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {showDatePicker && (
                <div className="calendar-popup" onClick={(e) => e.stopPropagation()}>
                    <Calendar onChange={setDate} value={date} />
                    <div className="calendar-actions">
                        <button onClick={handleSaveDate}>Save</button>
                        <button onClick={handleClear}>Clear</button>
                        <button onClick={() => setShowDatePicker(false)}>Cancel</button>
                    </div>
                </div>
            )}


            {showLabelPopup && (
                <div className="label-popup" onClick={(e) => e.stopPropagation()}>
                    <h3>Labels</h3>

                    {loadingLabels ? (
                        <p>Loading...</p>
                    ) : (
                        <div className="label-list">
                            {allLabels.map(label => {
                                const isSelected = selectedLabels.some(l => l.id === label.id);
                                return (
                                    <div key={label.id} className="label-row">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleLabel(label)}
                                        />
                                        <div
                                            className="label-color-box"
                                            style={{
                                                background: label.color,
                                                width: "90%",
                                                height: "20px",
                                                border: "2px solid gray"
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <button onClick={() => setShowLabelPopup(false)}>Close</button>
                </div>
            )}
        </div>
    );
}

export default CardModal;