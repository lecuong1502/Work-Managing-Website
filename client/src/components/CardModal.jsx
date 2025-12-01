import React from "react";
import "../styles/CardModal.css"

const CardModal = ({ card, onClose }) => {
    if (!card) return null;

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

                    <div className="modal-actions">
                        <button className="close-btn" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CardModal;