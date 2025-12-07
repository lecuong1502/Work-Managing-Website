import React, { useEffect } from "react";
import "../styles/CardModal.css"
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState } from "react";


const CardModal = ({ card, boardId, listId, onUpdate, onClose }) => {
    if (!card) return null;
    console.log("CardModal:  ", boardId, listId);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [date, setDate] = useState(card?.dueDate ? new Date(card.dueDate) : null);
    const [showLabelPopup, setShowLabelPopup] = useState(false);
    const [allLabels, setAllLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(true);

    const [selectedLabels, setSelectedLabels] = useState(card.labels || []);

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

    const formatDate = (d) => {
        if (!d) return null;
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0]
    };

    const handleSaveDate = () => {
        const updatedCard = {
            ...card,
            labels: selectedLabels,
            dueDate: formatDate(date)
        };
        saveToBackend(updatedCard);
        setShowDatePicker(false);
    };


    const handleClear = () => {
        setDate(null);
        saveToBackend({ ...card, labels: selectedLabels, dueDate: null });
        setShowDatePicker(false);
    };

    const saveToBackend = async (updated) => {
        const res = await fetch("http://localhost:3000/api/boards/" + boardId + "/lists/" + listId + "/cards/" + card.id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`
            },
            body: JSON.stringify(updated)
        });

        const data = await res.json();
        onUpdate(data, listId);
    };

    const handleClose = async () => {
        const updatedCard = { ...card, labels: selectedLabels, dueDate: formatDate(date) };
        await saveToBackend(updatedCard);
        onClose();
    };


    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>{card.title}</h2>

                        <button className="close-x" onClick={handleClose}>✕</button>
                    </div>

                    <div className="modal-body">

                        {selectedLabels.length > 0 && (
                            <div className="labels">
                                {selectedLabels.map((label) => (
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
                            <button onClick={() => setShowLabelPopup(!showLabelPopup)}> Label </button>
                            <button> <img src="/assets/check-circle.svg"></img>Checklist </button>
                            <button> <img src="/assets/paperclip.svg"></img>Attachment </button>
                            <button onClick={() => setShowDatePicker(!showDatePicker)}>DueDate</button>
                        </div>

                        {date && (
                            <p><strong>Due:</strong> {formatDate(date)}</p>
                        )}


                        {showDatePicker && (
                            <div className="calendar-popup">
                                <Calendar onChange={setDate} value={date} />

                                <div className="calendar-actions">
                                    <button onClick={handleSaveDate}> Save </button>
                                    <button onClick={handleClear}> Clear </button>
                                    <button onClick={() => setShowDatePicker(false)}> Cancel </button>
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
                                            const isSelected = selectedLabels.some(l => l.id === label.id)

                                            return (
                                                <div
                                                    key={label.id}
                                                    className="label-row"
                                                >
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
                                                    > </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                <button onClick={() => setShowLabelPopup(false)}>Close</button>
                            </div>

                        )}

                        <div className="modal-description">
                            {card.description}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default CardModal;