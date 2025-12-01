import React from "react";

const InboxPanel = ({ board }) => {
  // hiển thị tất cả card trong board theo kiểu inbox
  const cards = board.lists.flatMap(list => list.cards.map(card => ({ ...card, listTitle: list.title })));

  if (!cards.length) return <div>Không có thẻ nào trong Inbox</div>;

  return (
    <div className="inbox-container">
      <h3>Inbox</h3>
      {cards.map(card => (
        <div key={card.id} style={{ padding: '8px', marginBottom: '6px', background: '#f3f4f6', borderRadius: '6px' }}>
          <strong>{card.title}</strong>
          <div style={{ fontSize: '12px', color: '#555' }}>{card.listTitle}</div>
        </div>
      ))}
    </div>
  );
};

export default InboxPanel;
