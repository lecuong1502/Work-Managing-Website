import React, { useRef, useState } from "react";
import "../styles/CardItem.css";
import { useDrag, useDrop } from "react-dnd";

const CardItem = ({
    card,
    listId,
    boardId,
    index,
    onMoveCard,
    onClick,
    onToggleComplete,   // <-- thêm
    onArchive           // <-- thêm
}) => {

    const ref = useRef();
    const [showActions, setShowActions] = useState(false);

    const [{ isDragging }, drag] = useDrag({
        type: "card",
        item: {
            cardId: card.id,
            fromListId: listId,
            sourceBoardId: boardId,
            originalIndex: index
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: "card",
        hover: (item) => {
            if (!ref.current) return;

            const dragIndex = item.originalIndex;
            const hoverIndex = index;
            const fromList = item.fromListId;
            const toList = listId;

            if (dragIndex === hoverIndex && fromList === toList) return;

            onMoveCard(item.cardId, fromList, toList, hoverIndex);

            item.originalIndex = hoverIndex;
            item.fromListId = toList;
        },
    });

    drag(drop(ref));

    return (
        <div
            ref={ref}
            className={`card-item ${card.completed ? "completed" : ""}`}
            onClick={onClick}
            style={{ opacity: isDragging ? 0.5 : 1 }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div
                className={`circle-toggle ${card.completed ? "on" : ""}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(card);
                }}
            >
                {card.completed && <span className="checkmark">✓</span>}
            </div>

            <div className="card-content">
                {card.labels && (
                    <div className="labels">
                        {card.labels.map((label, idx) => (
                            <span style={{ backgroundColor: label.color }} key={idx} className="label">
                                {label.name}
                            </span>
                        ))}
                    </div>
                )}
                <h4>{card.title}</h4>
                {card.dueDate && <small>Hạn: {card.dueDate}</small>}


            </div>

            {showActions && (
                <div className="card-actions">
                    <button
                        className="card-action-btn archive-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive(card);
                        }}
                    >
                        archive
                    </button>
                </div>
            )}
        </div>
    );
};

export default CardItem;
