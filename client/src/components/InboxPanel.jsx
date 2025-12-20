import React, { useEffect, useRef } from "react";
import CardItem from "./CardItem";
import { useDrop } from "react-dnd";
import { io } from "socket.io-client";
import "../styles/InboxPanel.css";

const InboxPanel = ({
  inboxBoard,
  setInboxBoard,
  addingCard,
  setAddingCard,
  newCardTitle,
  setNewCardTitle,
  selectedCardId,
  setSelectedCardId,
  selectedListId,
  setSelectedListId,
  onAddInboxCard,
  currentBoardId,      // <-- Board hiện tại của người dùng (hoặc board parent muốn kéo vào)
  currentListId,
}) => {
  const inboxListId = inboxBoard?.lists?.[0]?.id;
  const inboxList = inboxBoard?.lists?.[0];
  const inboxCards = inboxList?.cards || [];


  if (!inboxListId) return null;


  const moveCard = (cardId, fromListId, toListId, toIndex, destBoardId = inboxBoard.id) => {
    const fromList = inboxBoard.lists.find(l => l.id === fromListId);
    if (!fromList) return;

    const movedCard = fromList.cards.find(c => c.id === cardId);
    if (!movedCard) return;

    const newLists = inboxBoard.lists.map(list => {
      if (list.id === fromListId) {
        return { ...list, cards: list.cards.filter(c => c.id !== cardId) };
      }
      return list;
    });

    const toList = newLists.find(l => l.id === toListId);
    if (!toList) return;

    if (toIndex === undefined) toIndex = toList.cards.length;
    toList.cards.splice(toIndex, 0, movedCard);

    const updated = { ...inboxBoard, lists: newLists };
    setInboxBoard(updated); // Cập nhật giao diện ngay

    fetch("http://localhost:3000/api/cards/move", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        sourceBoardId: inboxBoard.id,
        sourceListId: fromListId,
        destBoardId,       // <-- sử dụng param destBoardId
        destListId: toListId,
        cardId,
        index: toIndex,
      }),
    })
      .then(res => res.json())
      .then(data => console.log("Backend inbox:", data.message))
      .catch(err => console.error("Lỗi move inbox:", err));
  };


  const socketRef = useRef(null);

  const [, drop] = useDrop({
  accept: "card",
  drop: (item, monitor) => {
    if (!monitor.isOver({ shallow: true })) return;

    if (item.fromBoardId === inboxBoard.id) {
      console.log("Card already in Inbox board");
      return;
    }

    // Khi kéo vào InboxPanel, giả sử kéo vào "board hiện tại" (currentBoardId + currentListId)
    moveCard(
      item.cardId,
      item.fromListId,
      currentListId || inboxListId,
      undefined,
      currentBoardId || inboxBoard.id  // <-- Board đích thực sự
    );
  },
});


  const handleSubmit = () => {
    if (!newCardTitle.trim()) return;
    onAddInboxCard(inboxListId, newCardTitle);
  };

  return (
    <div ref={drop} className="inbox-panel">
      <h3 className="inbox-title">Inbox</h3>

      {inboxCards.length === 0 && <p className="empty">Không có thẻ nào</p>}

      {inboxCards.map((card, idx) => (
        <CardItem
          key={card.id}
          card={card}
          index={idx}
          boardId={inboxBoard.id}
          listId={inboxListId}
          onMoveCard={moveCard}
          onClick={() => {
            setSelectedCardId(card.id);
            setSelectedListId(inboxListId);
          }}

        />
      ))}

      {addingCard["inbox"] ? (
        <div className="add-card-form">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Card title..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />

          <button
            onClick={() => {
              setNewCardTitle("");
              setAddingCard(prev => ({ ...prev, inbox: false }));
            }}
          >
            Cancel
          </button>

          <button onClick={() => handleSubmit()}>
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
