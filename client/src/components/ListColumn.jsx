import React from "react";
import CardItem from "./CardItem";
import "../styles/ListColumn.css";
import { useDrag, useDrop } from "react-dnd";
import { PencilIcon } from "@heroicons/react/24/outline";


const ListColumn = ({
  list,
  index,
  moveList,
  board,
  setBoard,
  renamingList,
  setRenamingList,
  newListName,
  setNewListName,
  handleRenameList,
  addingCard,
  setAddingCard,
  selectedCardId,
  setSelectedCardId,
  selectedListId,
  setSelectedListId,
  selectedBoardId,
  setSelectedBoardId,
  handleAddCard,
  newCardTitle,
  setNewCardTitle,
  onUpdateCard,
  onMoveCardOutOfInbox,
  inboxBoardId,
  inboxBoard,
  setInboxBoard,
  setToast,
}) => {
  const moveCard = (cardId, fromListId, toListId, toIndex, sourceBoardId, cardData) => {
    // console.group(">>> [DEBUG MOVE_CARD]");
    // console.log("1. Card ID:", cardId);
    // console.log("2. From List ID (Nguồn):", fromListId);
    // console.log("3. To List ID (Đích):", toListId);
    // console.log("4. Source Board ID (Nguồn):", sourceBoardId);
    // console.log("5. Dest Board ID (Đích):", board.id);
    // console.log("6. Card Data:", cardData);
    // console.groupEnd();

    const previousBoardState = { ...board };
    const previousInboxState = { ...inboxBoard };

    const isFromInbox = String(sourceBoardId) === String(inboxBoardId);

    if (isFromInbox && String(board.id) !== String(inboxBoardId)) {
      onMoveCardOutOfInbox(cardId, fromListId);
    }

    if (!fromListId || !toListId || !sourceBoardId) {
      console.error("!!! LỖI NGHIÊM TRỌNG: Một trong các ID bị undefined. Backend sẽ tèo!");
    }

    if (
      String(sourceBoardId) === String(inboxBoardId) &&
      String(board.id) !== String(inboxBoardId)
    ) {
      onMoveCardOutOfInbox(cardId, fromListId);
    }


    // Check xem có phải di chuyển nội bộ trong board này không
    const isInternalMove = !sourceBoardId || String(sourceBoardId) === String(board.id);

    console.log(`Move: ${cardId} | Internal: ${isInternalMove} | Data:`, cardData);

    // --- 1. CẬP NHẬT GIAO DIỆN NGAY LẬP TỨC (OPTIMISTIC UI) ---
    setBoard((prevBoard) => {
      // Clone deep để không ảnh hưởng state cũ
      const newLists = prevBoard.lists.map(l => ({
        ...l,
        cards: [...l.cards]
      }));

      // A. Nếu là nội bộ: Xóa thẻ ở list cũ
      if (isInternalMove) {
        const sourceList = newLists.find(l => l.id === fromListId);
        if (sourceList) {
          sourceList.cards = sourceList.cards.filter(c => c.id !== cardId);
        }
      }

      // B. Thêm thẻ vào list đích (Áp dụng cho cả Nội bộ và Inbox)
      const destList = newLists.find(l => l.id === toListId);
      if (destList) {

        let cardToAdd = null;

        // Nội bộ board
        if (isInternalMove) {
          const originalSourceList = prevBoard.lists.find(l => l.id === fromListId);
          cardToAdd = originalSourceList?.cards.find(c => c.id === cardId);
        }

        // TỪ INBOX SANG BOARD
        else {
          cardToAdd = cardData; // cardData
        }

        if (cardToAdd) {
          // Reset trạng thái thẻ để nó hiện ra (Inbox state là "Inbox", vào board phải là "Inprogress")
          const normalizedCard = {
            ...cardToAdd,
            state: "Inprogress", // Bắt buộc đổi state này để không bị filter ẩn đi
            isGlobalInbox: false // Xóa cờ này đi
          };

          const finalIndex = toIndex !== undefined ? toIndex : destList.cards.length;
          destList.cards.splice(finalIndex, 0, normalizedCard);
        }
      }

      const updatedBoard = { ...prevBoard, lists: newLists };
      //sessionStorage.setItem("boards", JSON.stringify(updatedBoard));
      return updatedBoard;
    });

    // --- 2. GỌI API ---
    // Tính toán index cho API
    const destListRef = board.lists.find((l) => l.id === toListId);
    const apiIndex = toIndex !== undefined ? toIndex : (destListRef?.cards.length || 0);

    fetch("http://localhost:3000/api/cards/move", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        sourceBoardId: sourceBoardId || board.id,
        sourceListId: fromListId,
        destBoardId: board.id,
        destListId: toListId,
        cardId,
        index: apiIndex,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // A. Lấy thông tin lỗi từ server
          const errorData = await res.json();
          
          // B. Bắn alert cảnh báo (Ví dụ: 403 Forbidden)
          setToast({ message: "Không được quyền sửa!", type: "error" });
          
          // C. HOÀN TÁC (ROLLBACK) UI
          setBoard(previousBoardState);

          if (isFromInbox) {
            setInboxBoard(previousInboxState); // Trả Inbox về trạng thái cũ (hiện lại thẻ vừa mất)
          }
        } else {
          console.log("Backend sync success");
        }
      })
      .catch((err) => {
        console.error("API Error:", err);
        alert("Lỗi kết nối server. Thẻ sẽ được trả về vị trí cũ.");
        setBoard(previousBoardState); // Rollback nếu lỗi mạng
        if (isFromInbox) setInboxBoard(previousInboxState);
      });
  };

  const listRef = React.useRef(null);
  const cardDropRef = React.useRef(null);

  const [, listDrop] = useDrop({
    accept: "list",
    hover(item, monitor) {
      if (!monitor.isOver({ shallow: true })) return;
      if (item.index === index) return;

      moveList(item.index, index);
      item.index = index;
    },
  });

  const [, drag] = useDrag({
    type: "list",
    item: { type: "list", index },
  });

  drag(listDrop(listRef));


  const [, cardDrop] = useDrop({
    accept: "card",
    drop(item, monitor) {
      const { cardId, fromListId, boardId, cardData } = item;

      const isDifferentList = fromListId !== list.id;
      const isDifferentBoard = boardId && String(boardId) !== String(board.id);

      if (isDifferentList || isDifferentBoard) {
        // Truyền boardId (source) vào hàm moveCard
        moveCard(cardId, fromListId, list.id, list.cards.length, boardId, cardData);

        // Cập nhật lại item để DND hiểu vị trí mới
        item.fromListId = list.id;
        item.boardId = board.id; // Cập nhật lại thành board hiện tại
      }
    },
  });

  cardDrop(cardDropRef);

  const VISIBLE_CARD_STATES = ["Inprogress", "Done"];

  const handleArchiveCard = (card) => {
    onUpdateCard({ ...card, state: "Archived" }, list.id, board.id);
  };

  const handleToggleCardState = (card) => {
    const nextState = card.state === "Done" ? "Inprogress" : "Done";

    onUpdateCard({ ...card, state: nextState }, list.id, board.id);
  };

  return (
    <div ref={listRef} className="list-column">
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
            <button
              className="rename-btn"
              onClick={() => {
                setRenamingList(list.id);
                setNewListName(list.title);
              }}
            >
              <PencilIcon className="icon" />
            </button>
          </div>
        )}
      </div>

      <div ref={cardDropRef} className="card-container">
        {list.cards.length === 0 && <p className="empty">Không có thẻ nào</p>}
        {list.cards
          .filter((card) => VISIBLE_CARD_STATES.includes(card.state))
          .map((card, idx) => (
            <CardItem
              key={card.id}
              card={card}
              listId={list.id}
              boardId={board.id}
              index={idx}
              onMoveCard={moveCard}
              onClick={() => {
                  setSelectedCardId(card.id),
                  setSelectedListId(list.id),
                  setSelectedBoardId(board.id);
              }}
              onToggleState={handleToggleCardState}
              onArchive={handleArchiveCard}
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
          <button
            onClick={() => {
              setNewCardTitle("");
              setAddingCard((prev) => ({ ...prev, [list.id]: false }));
            }}
          >
            Cancel
          </button>
          <button onClick={() => handleAddCard(list.id, newCardTitle)}>
            Add
          </button>
        </div>
      ) : (
        <button
          className="add-card-btn"
          onClick={() =>
            setAddingCard((prev) => ({ ...prev, [list.id]: true }))
          }
        >
          + Add a card
        </button>
      )}
    </div>
  );
};

export default ListColumn;