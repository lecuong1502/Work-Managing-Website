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

    const moveCard = (cardId, fromListId, toListId, toIndex) => {
        console.log("Di chuyển thẻ:", cardId, "từ", fromListId, "đến", toListId, "vị trí", toIndex);
        const fromList = board.lists.find(l => l.id === fromListId);
        if (!fromList) return;

        const movedCard = fromList.cards.find(c => c.id === cardId);
        if (!movedCard) return;

        const destList = board.lists.find(l => l.id === toListId);
        const finalIndex = toIndex !== undefined ? toIndex : destList.cards.length;

        const newLists = board.lists.map(l => {
            if (l.id === fromListId) {
                return { ...l, cards: l.cards.filter(c => c.id !== cardId) };
            }
            return l;
        });
        const destListUpdated = newLists.find(l => l.id === toListId);
        destListUpdated.cards.splice(Math.min(finalIndex, destListUpdated.cards.length), 0, movedCard);

        setBoard({ ...board, lists: newLists });
        sessionStorage.setItem("boards", JSON.stringify({ ...board, lists: newLists }));

        fetch("http://localhost:3000/api/cards/move", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionStorage.getItem("token")}`
            },
            body: JSON.stringify({
                sourceBoardId: board.id,
                sourceListId: fromListId,
                destBoardId: board.id,
                destListId: toListId,
                cardId,
                index: finalIndex
            })
        })
        .then(res => res.json())
        .then(data => console.log("Backend:", data.message))
        .catch(err => console.error("Lỗi di chuyển thẻ:", err));
    };

    const [, drop] = useDrop({
        accept: "card",
        drop: (item, monitor) => {
            if (!monitor.isOver({ shallow: true })) return;

            const { cardId, fromListId } = item;
            const toListId = list.id;

            moveCard(cardId, fromListId, toListId, list.cards.length);
        }
    });

    return (
        <div ref={drop} className="list-column">
            <div className="list-header">
                {renamingList === list.id ? (
                    <div className="rename-list-box">
                        <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                        />
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
                {list.cards.length === 0 && <p className="empty">Không có thẻ nào</p>}
                {list.cards.map((card, idx) => (
                    <CardItem
                        key={card.id}
                        card={card}
                        listId={list.id}
                        boardId={board.id}
                        index={idx}
                        onMoveCard={moveCard}
                        onClick={() => setSelectedCard(card)}
                    />
                ))}
            </div>
            {addingCard[list.id] ? (
                    <div className="add-card-form">
                        <input
                            type="text"
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            placeholder="Card title..."
                        />
                        <button onClick={() => {
                            setNewCardTitle("");
                            setAddingCard(prev => ({ ...prev, [list.id]: false }))
                        }}>Cancel</button>
                        <button onClick={() => handleAddCard(list.id, newCardTitle)}>Add</button>
                    </div>
                ) : (
                    <button
                        className="add-card-btn"
                        onClick={() => setAddingCard(prev => ({ ...prev, [list.id]: true }))}
                    >
                        + Add a card
                    </button>
                )}
        </div>
    );
};

export default ListColumn;
