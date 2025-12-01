import React from "react";
import CardItem from "./CardItem";
import "../styles/ListColumn.css";
import { useDrop } from "react-dnd";

const ListColumn = ({
    list,
    board,
    setBoard,
    renamingList,
    setRenamingList,
    newListName,
    setNewListName,
    handleRenameList,
    addingCard,
    setAddingCard,
    selectedCard,
    setSelectedCard,
    handleAddCard,
    newCardTitle,
    setNewCardTitle
}) => {
    const [, drop] = useDrop({
        accept: "card",
        drop: (item, monitor) => {
            if (!monitor.isOver({ shallow: true })) return;
            const { cardId, fromListId, sourceBoardId } = item;

            const destBoardId = board.id;
            const destListId = list.id;

            const index = list.cards.length;

            fetch("http://localhost:3000/api/cards/move", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sourceBoardId,
                    sourceListId: fromListId,
                    destBoardId,
                    destListId,
                    cardId,
                    index
                })
            })
            .then(res=> res.json())
            .then(data=>{
                console.log(data.message);

                const newLists = board.lists.map(l => ({
                    ...l,
                    cards: [...l.cards]
            }));

            let moveCard;
            newLists.forEach(l => {
                const idx = l.cards.findIndex(c => c.id === cardId);    
                if (idx !== -1) {
                    moveCard = l.cards[idx];
                    l.cards.splice(idx, 1);
                }
            })

            const toList = newLists.find(l => l.id === destListId);
            toList.cards.splice(index, 0, moveCard);

            setBoard({ ...board, lists: newLists });
            sessionStorage.setItem("boards", JSON.stringify({ ...board, lists: newLists }));
        }).catch(err=> console.error("Lỗi di chuyển thẻ:", err));}
    });

    return (
        <div ref={drop} key={list.id} className="list-column">
            <div className="list-header">
                {renamingList === list.id ? (
                    <div className="rename-list-box">
                        <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)} />
                        <button onClick={() => handleRenameList(list.id)}>Save</button>
                        <button onClick={() => setRenamingList(null)}>Cancel</button>

                    </div>
                ) : (
                    <div className="list-title-row">
                        <h3>{list.title}</h3>
                        <button className="rename-btn" onClick={() => {
                            setRenamingList(list.id);
                            setNewListName(list.title);
                        }}><img src="/assets/edit.svg" alt='rename'></img></button>
                    </div>
                )}
            </div>
            <div className="card-container">
                {list.cards.length === 0 && (
                    <p className="empty">Không có thẻ nào</p>
                )}
                {list.cards.map((card) => (
                    <CardItem key={card.id} card={card} listId={list.id} boardId ={board.id}onClick={() => setSelectedCard(card)} />
                ))}
                {addingCard[list.id] ? (
                    <div className="add-card-form">
                        <input
                            type="text"
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            placeholder="Card title..." />
                        <button onClick={() => {
                            setNewCardTitle("");
                            setAddingCard(prev => ({ ...prev, [list.id]: false }))
                        }}>Cancel</button>
                        <button onClick={() => handleAddCard(list.id, newCardTitle)}>Add</button>
                    </div>
                ) : (<button
                    className="add-card-btn"
                    onClick={() => setAddingCard(prev => ({ ...prev, [list.id]: true }))}
                >
                    + Add a card
                </button>
                )}
            </div>
        </div>
    )
}

export default ListColumn;