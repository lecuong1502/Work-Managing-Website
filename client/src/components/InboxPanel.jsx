import React from "react";
import CardItem from "./CardItem";
import { useDrop } from "react-dnd";
import "../styles/InboxPanel.css";

const InboxPanel = ({
  inboxCards,
  board,
  setBoard,
  addingCard,
  setAddingCard,
  newCardTitle,
  setNewCardTitle,
  handleAddCard,
  selectedCard,
  setSelectedCard
}) => {

  const moveCard = (cardId, fromListId, toListId, toIndex) => {
    const fromList = board.lists.find(l => l.id === fromListId);
    if (!fromList) return;

    const movedCard = fromList.cards.find(c => c.id === cardId);
    if (!movedCard) return;

    const newLists = board.lists.map(list => {
      if (list.id === fromListId) {
        return { ...list, cards: list.cards.filter(c => c.id !== cardId) };
      }
      return list;
    });

    const toList = newLists.find(l => l.id === toListId);
    if (!toList) return;

    if (toIndex === undefined) toIndex = toList.cards.length;
    toList.cards.splice(toIndex, 0, movedCard);

    const updated = { ...board, lists: newLists };
    setBoard(updated);
    sessionStorage.setItem("boards", JSON.stringify(updated));

    fetch("http://localhost:3000/api/cards/move", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        sourceBoardId: board.id,
        sourceListId: fromListId,
        destBoardId: board.id,
        destListId: toListId,
        cardId,
        index: toIndex,
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log("Backend inbox:", data.message))
      .catch((err) => console.error("Lỗi move inbox:", err));
  };

  const [, drop] = useDrop({
    accept: "card",
    drop: (item, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      moveCard(item.cardId, item.fromListId, "inbox");
    },
  });

  return (
    <div ref={drop} className="inbox-panel">
      <h3 className="inbox-title">Inbox</h3>

      {inboxCards.length === 0 && <p className="empty">Không có thẻ nào</p>}

      {inboxCards.map((card, idx) => (
        <CardItem
          key={card.id}
          card={card}
          listId="inbox"
          boardId={board.id}
          index={idx}
          onMoveCard={moveCard}
          onClick={() => setSelectedCard({ ...card, listId:"inbox", boardId: board.id })}
        />
      ))}

      {addingCard["inbox"] ? (
        <div className="add-card-form">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Card title..."
          />

          <button
            onClick={() => {
              setNewCardTitle("");
              setAddingCard(prev => ({ ...prev, inbox: false }));
            }}
          >
            Cancel
          </button>

          <button onClick={() => handleAddCard("inbox", newCardTitle)}>
            Add
          </button>
        </div>
      ) : (
        <button
          className="add-card-btn"
          onClick={() =>
            setAddingCard(prev => ({ ...prev, inbox: true }))
          }
        >
          + Add a card
        </button>
      )}
    </div>
  );
};

export default InboxPanel;
