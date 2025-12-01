import React from "react";
import "../styles/CardItem.css";
import { useDrag } from "react-dnd";

const CardItem = ({ card,listId,boardId, onClick }) => {
const [{ isDragging},drag] = useDrag(() => ({
    type: "card",
    item: { 
        cardId: card.id , 
        fromListId: listId,
        sourceBoardId: boardId},
    collect: (monitor) => ({    
        isDragging: !!monitor.isDragging(),
    }),
}));
    return (
        <div ref={drag} key={card.id} className="card-item" onClick={onClick} style={{opacity : isDragging ? 0.5 : 1}}>
            <h4>{card.title}</h4>
            <p>{card.description}</p>
            {card.dueDate && (
                <small>Hạn:{card.dueDate}</small>
            )}
            {card.labels && (
                <div className="labels">
                    {card.labels.map((label, idx) => (
                        <span key={idx} className="label">{label}</span>
                    ))}
                </div>
            )}
        </div>
    )
}

export default CardItem;