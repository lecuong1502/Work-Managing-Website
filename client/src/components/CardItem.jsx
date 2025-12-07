import React, { useRef } from "react";
import "../styles/CardItem.css";
import { useDrag, useDrop } from "react-dnd";

const CardItem = ({ card, listId, boardId, index, onMoveCard, onClick }) => {
    const ref = useRef();
    console.log("CardID là:",card.id, listId, boardId);
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
            className="card-item"
            onClick={onClick}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <h4>{card.title}</h4>
            <p>{card.description}</p>
            {card.dueDate && <small>Hạn: {card.dueDate}</small>}
            {card.labels && (
                <div className="labels">
                    {card.labels.map((label, idx) => (
                        <span style={{backgroundColor:label.color}}key={idx} className="label">{label.name}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CardItem;
