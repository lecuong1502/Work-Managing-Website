import React from "react";
import "../styles/CardModal.css"
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState } from "react";


const CardModal = ({ card, onClose }) => {
    if (!card) return null;
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [date, setDate] = useState(card?.dueDate ? new Date(card.dueDate) : null);

    const handleSave = () => {
    if (!date) return;

    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];

    card.dueDate = localDate;

    setShowDatePicker(false);
};


    const handleClear = () => {
        setDate(null);
        card.dueDate = null;
        setShowDatePicker(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2>{card.title}</h2>
                    <p>{card.description}</p>
                    <div className="feature">
                        <button>+ Add</button>
                        <button> Label </button>
                        <button> <img src="/assets/check-circle.svg"></img>Checklist </button>
                        <button> <img src="/assets/paperclip.svg"></img>Attachment </button>
                        <button onClick={() => setShowDatePicker(!showDatePicker)}>DueDate</button>
                    </div>

                    {card.dueDate && (
                        <p><strong>Due:</strong>{card.dueDate}</p>
                    )}

                    {card.labels && (
                        <div className="labels">
                            {card.labels.map((label, i) => (
                                <span key={i} className="label">{label}</span>
                            ))}
                        </div>
                    )}

                    {showDatePicker && (
                        <div className="calendar-popup">
                            <Calendar onChange={setDate} value={date}/>

                            <div className="calendar-actions">
                                <button onClick ={handleSave}> Save </button>
                                <button onClick ={handleClear}> Clear </button>
                                <button onClick ={()=> setShowDatePicker (false)}> Cancel </button>
                            </div>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button className="close-btn" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CardModal;