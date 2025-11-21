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
    setSelectedCard
}) => {
    const [, drop] = useDrop({
    accept: "card",
    drop: (item) => {
        const { cardId } = item;
        const newLists = board.lists.map(l => ({
            ...l,
            cards: l.cards.map(c => ({ ...c }))
        }));

        let fromList, cardToMove;
        for (const l of newLists) {
            const idx = l.cards.findIndex(c => c.id === cardId);
            if (idx !== -1) {
                fromList = l;
                [cardToMove] = l.cards.splice(idx, 1); 
                break;
            }
        }

        const toList = newLists.find(l => l.id === list.id); 

        toList.cards.push(cardToMove);

        const newBoard = { ...board, lists: newLists };
        setBoard(newBoard);
        sessionStorage.setItem("boards", JSON.stringify(newBoard));
    }
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
                    <CardItem key={card.id} card={card} listId={list.id} onClick={() => setSelectedCard(card)} />
                ))}
                {addingCard[list.id] ? (
                    <div className="add-card-form">
                        <input type="text" placeholder="Card title..." />
                        <button onClick={() => setAddingCard(prev => ({ ...prev, [list.id]: false }))}>Cancel</button>
                        <button>Add</button>
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