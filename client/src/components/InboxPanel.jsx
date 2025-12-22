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
  setSelectedBoardId,
  onAddInboxCard,
  currentBoardId,      // <-- Board hiện tại của người dùng (hoặc board parent muốn kéo vào)
  currentListId,
}) => {
  const inboxListId = inboxBoard?.lists?.[0]?.id;
  const inboxList = inboxBoard?.lists?.[0];
  const inboxCards = inboxList?.cards || [];


  if (!inboxListId) return null;


  const moveCard = (cardId, fromListId, toListId, toIndex, sourceBoardId, cardData) => {
    // 1. Xác định hướng di chuyển
    const isEnteringInbox = sourceBoardId && String(sourceBoardId) !== String(inboxBoard.id);
    const isInternalInbox = String(sourceBoardId) === String(inboxBoard.id) && String(toListId).startsWith("list_inbox");
    const isLeavingInbox = String(sourceBoardId) === String(inboxBoard.id) && !String(toListId).startsWith("list_inbox");

    // 2. CẬP NHẬT UI
    setInboxBoard((prevInbox) => {
      const newLists = prevInbox.lists.map(l => ({ ...l, cards: [...l.cards] }));

      // TRƯỜNG HỢP A: Card rời khỏi Inbox (Kéo sang Board Main)
      if (isLeavingInbox) {
        const sourceList = newLists.find(l => l.id === fromListId);
        if (sourceList) {
          sourceList.cards = sourceList.cards.filter(c => c.id !== cardId);
        }
      }

      // TRƯỜNG HỢP B: Card đi vào hoặc di chuyển nội bộ Inbox
      else {
        const destList = newLists.find(l => l.id === toListId);
        if (!destList) return prevInbox;

        let cardToAdd = null;

        if (isEnteringInbox) {
          cardToAdd = cardData;
        } else {
          const sourceList = newLists.find(l => l.id === fromListId);
          if (sourceList) {
            cardToAdd = sourceList.cards.find(c => c.id === cardId);
            sourceList.cards = sourceList.cards.filter(c => c.id !== cardId);
          }
        }

        if (cardToAdd) {
          const normalizedCard = { ...cardToAdd, state: "Inbox", isGlobalInbox: true };
          const finalIndex = toIndex !== undefined ? toIndex : destList.cards.length;
          if (!destList.cards.find(c => c.id === cardId)) {
            destList.cards.splice(finalIndex, 0, normalizedCard);
          }
        }
      }

      return { ...prevInbox, lists: newLists };
    });

    // 3. GỌI API (Chỉ gọi nếu đích đến là Inbox, 
    // nếu kéo sang Main thì hàm moveCard của ListColumn sẽ lo phần API của nó)
    if (!isLeavingInbox) {
      fetch("http://localhost:3000/api/cards/move", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          sourceBoardId: sourceBoardId,
          sourceListId: fromListId,
          destBoardId: inboxBoard.id,
          destListId: toListId,
          cardId,
          index: toIndex || 0,
        }),
      })
        .then(res => res.json())
        .catch(err => console.error("Lỗi đồng bộ Inbox:", err));
    }
  };

  const socketRef = useRef(null);

  const [, drop] = useDrop({
    accept: "card",
    drop: (item, monitor) => {
      // shallow: true để đảm bảo không kích hoạt drop lên nhiều tầng
      if (!monitor.isOver({ shallow: true })) return;

      // Gọi moveCard với thông tin từ card đang kéo
      moveCard(
        item.cardId,
        item.fromListId,
        inboxListId,      // List ID của Inbox
        undefined,        // Thêm vào cuối list
        item.boardId,     // Board nguồn (Board Main)
        item.cardData     // Dữ liệu card
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
            setSelectedBoardId(inboxBoard.id);
          }}

        />
      ))}
      {addingCard["inbox"] ? (
        <div className="add-card-form">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="What is your task today?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <div className="add-card-form-actions"> 
            <button
              onClick={() => {
                setNewCardTitle("");
                setAddingCard((prev) => ({ ...prev, inbox: false }));
              }}
            >
              Cancel
            </button>
            <button onClick={() => handleSubmit()}> Add </button>
          </div>
        </div>
      ) : (
        <button
          className="add-card-btn"
          onClick={() => setAddingCard((prev) => ({ ...prev, inbox: true }))}
        >
          +Add a Card
        </button>
      )}
    </div>
  );
};

export default InboxPanel;
