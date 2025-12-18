import React, { useEffect, useRef } from "react";
import CardItem from "./CardItem";
import { useDrop } from "react-dnd";
import { io } from "socket.io-client";
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
  selectedCardId,
  setSelectedCardId,
  selectedListId,

  onAddInboxCard
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
      .then((data) => {
        console.log("Backend inbox:", data.message);
        // Optionally emit local socket event (server will broadcast to other clients)
        if (socketRef.current) {
          socketRef.current.emit('client_card_moved', {
            sourceBoardId: board.id,
            sourceListId: fromListId,
            destBoardId: board.id,
            destListId: toListId,
            cardId,
            index: toIndex,
          });
        }
      })
      .catch((err) => console.error("Lỗi move inbox:", err));
  };

  const socketRef = useRef(null);

  // useEffect(() => {
  //   const token = sessionStorage.getItem("token");
  //   try {
  //     const s = io("http://localhost:3000", { auth: { token } });
  //     s.on('connect', () => console.log('InboxPanel socket connected', s.id));
  //     s.on('connect_error', (err) => {
  //       console.error('InboxPanel socket connect_error:', err);
  //       // Show more details when available
  //       if (err && err.data) console.error('connect_error data:', err.data);
  //     });
  //     s.on('reconnect_failed', () => console.warn('InboxPanel socket reconnect_failed'));
  //     socketRef.current = s;

  //     // join the board room so this client receives board-scoped updates
  //     if (board && board.id) {
  //       s.emit("join-board", board.id);
  //     }

  //     // When a card is moved elsewhere, refresh the board so UI updates immediately
  //     s.on('CARD_MOVED', (payload) => {
  //       console.log('[socket] CARD_MOVED received in InboxPanel:', payload);
  //       try {
  //         // Only refresh if the event is relevant to current board
  //         if (board && (String(payload.sourceBoardId) === String(board.id) || String(payload.destBoardId) === String(board.id))) {
  //           const token = sessionStorage.getItem('token');
  //           fetch(`http://localhost:3000/api/boards/${board.id}`, {
  //             headers: {
  //               'Content-Type': 'application/json',
  //               'Authorization': `Bearer ${token}`
  //             }
  //           })
  //             .then(res => res.json())
  //             .then(data => {
  //               // Replace entire board state with fresh server data
  //               if (data && data.id) {
  //                 setBoard(data);
  //                 sessionStorage.setItem('boards', JSON.stringify(data));
  //               }
  //             })
  //             .catch(err => console.error('Failed to refresh board after CARD_MOVED:', err));
  //         }
  //       } catch (e) {
  //         console.error('Error handling CARD_MOVED in InboxPanel:', e);
  //       }
  //     });

  //     return () => {
  //       if (socketRef.current) socketRef.current.disconnect();
  //     };
  //   } catch (e) {
  //     console.error('Socket init error', e);
  //   }
  // }, [board]);

  const [, drop] = useDrop({
    accept: "card",
    drop: (item, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      moveCard(item.cardId, item.fromListId, "inbox");
    },
  });

  const handleSubmit = () => {
      if (!newCardTitle.trim()) return;
      onAddInboxCard(newCardTitle); 
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
          boardId="inbox-global"
          listId="inbox-list"   
          onMoveCard={moveCard}
          onClick={() => setSelectedCardId(card.id) & setSelectedListId("inbox-list")}
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

          <button onClick={handleSubmit}>
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
