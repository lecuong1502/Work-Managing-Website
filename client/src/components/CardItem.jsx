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
            boardId: boardId,
            originalIndex: index,
            cardData: card
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: "card",
        hover: (item, monitor) => {
            if (!ref.current) return;

            const dragIndex = item.originalIndex;
            const hoverIndex = index;

            // LẤY ĐÚNG TÊN BIẾN: Trong useDrag bạn để là 'boardId'
            const sourceBoardId = item.boardId;

            // Kiểm tra nếu cùng 1 card thì không làm gì
            if (item.cardId === card.id) return;

            // Nếu di chuyển nội bộ trong cùng 1 list và cùng index thì không làm gì
            if (item.fromListId === listId && dragIndex === hoverIndex && sourceBoardId === boardId) {
                return;
            }

            // Thực hiện di chuyển
            onMoveCard(
                item.cardId,
                item.fromListId,
                listId,
                hoverIndex,
                sourceBoardId,
                item.cardData
            );

            // QUAN TRỌNG: Cập nhật lại item để tránh loop hover liên tục
            item.originalIndex = hoverIndex;
            item.fromListId = listId;
            item.boardId = boardId; // Cập nhật board hiện tại để biến nó thành di chuyển nội bộ sau khi đã vào board
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
