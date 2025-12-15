import React, { useRef, useState } from "react";
import "../styles/CardItem.css";
import { useDrag, useDrop } from "react-dnd";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";


const CardItem = ({
    card,
    listId,
    boardId,
    index,
    onMoveCard,
    onClick,
    onToggleState,
    onArchive
}) => {

    const ref = useRef();

    const isDone = card.state === "Done";


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
            className={`card-item ${isDone ? "done" : ""}`}
            onClick={onClick}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <div
                className={`circle-toggle ${isDone ? "on" : ""}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleState(card);
                }}
            >
                {isDone && <CheckIcon className="checkmark-icon" />}

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

            {card.state === "Done" && (
                <div className="card-actions">
                    <button
                        className="archive-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive(card);
                        }}
                        title="Archive card"
                    >
                        <ArchiveBoxIcon className="archive-icon" />
                    </button>
                </div>
            )}

        </div>
    );
};

export default CardItem;
