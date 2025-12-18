import React, { useEffect } from "react";
import "../styles/CardModal.css"
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState } from "react";
import socket from "../socket";
import ActivityItem from "./ActivityItem";
import CommentItem from "./CommentItem";
import { CheckIcon } from "@heroicons/react/24/solid";

const CardModal = ({ board, card, list, boardId, listId, onUpdate, onClose }) => {
    if (!card) return null;

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [date, setDate] = useState(card?.dueDate ? new Date(card.dueDate) : null);
    const [showLabelPopup, setShowLabelPopup] = useState(false);
    const [allLabels, setAllLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(true);

    const [selectedLabels, setSelectedLabels] = useState(card.labels || []);

    const [editDescription, setEditDescription] = useState(false);
    const [editedDesciption, setEditedDesciption] = useState(card.description || "");

    const [editTitle, setEditTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(card.title || "");


    const [comments, setComments] = useState([]);
    const [input, setInput] = useState("");

    const [checklists, setChecklists] = useState([]);
    const [loadingChecklist, setLoadingChecklist] = useState(false);
    const [newItemText, setNewItemText] = useState({});

    const [showMemberPopup, setShowMemberPopup] = useState(false);

    const boardMembers = board.members || [];

    const [activities, setActivities] = useState([]);

    useEffect(() => {
        setEditedTitle(card.title || "");
        setEditedDesciption(card.description || "");
        setSelectedLabels(card.labels || []);
        setDate(card.dueDate ? new Date(card.dueDate) : null);
    }, [card]);



    useEffect(() => {
        if (!card?.id) return;

        const fetchActivities = async () => {
            try {
                const res = await fetch(
                    `http://localhost:3000/api/cards/${card.id}/activities`,
                    {
                        headers: {
                            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                        },
                    }
                );
                const data = await res.json();
                setActivities(data);
            } catch (err) {
                console.error("Load activities failed", err);
            }
        };

        fetchActivities();
    }, [card.id]);


    //them member vao card
    const handleAddMember = (member) => {
        const currentMembers = card.members || [];
        if (currentMembers.includes(member.id)) return;

        onUpdate(
            {
                ...card,
                members: [...currentMembers, member.id],
            },
            listId
        );

        setShowMemberPopup(false);
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const newComment = {
            id: `cmt_${Date.now()}`,
            text: input,
            createdAt: new Date(),
            user: {
                id: "me",
                name: "You",
                avatar: null,
            },
        };

        setComments(prev => [...prev, newComment]);
        setInput("");
    };



    useEffect(() => {
        fetch("/labels.json")
            .then((res) => res.json())
            .then((data) => setAllLabels(data.labels))
            .catch((err) => console.error("Lỗi load labels", err))
            .finally(() => setLoadingLabels(false))
    }, [])

    const toggleLabel = (label) => {
        const exists = selectedLabels.some(l => l.id === label.id);

        const updated = exists
            ? selectedLabels.filter(l => l.id !== label.id)
            : [...selectedLabels, label];

        setSelectedLabels(updated);
        onUpdate({ ...card, labels: updated, description: editedDesciption, dueDate: formatDate(date) }, listId);
    };

    const formatDate = (d) => d ? d.toLocaleDateString() : null;

    const handleSaveDate = () => {
        const updatedCard = {
            ...card,
            labels: selectedLabels,
            description: editedDesciption,
            dueDate: formatDate(date)
        };
        onUpdate(updatedCard, listId);
        setShowDatePicker(false);
    };

    const handleSaveDescription = () => {
        const updatedCard = {
            ...card,
            labels: selectedLabels,
            description: editedDesciption,
            dueDate: formatDate(date)
        };
        onUpdate(updatedCard, listId);
        setEditDescription(false);
    }


    const handleClear = () => {
        setDate(null);
        onUpdate({ ...card, labels: selectedLabels, dueDate: null }, listId);
        setShowDatePicker(false);
    };

    const handleClose = async () => {
        onClose();

    };

    const handleOverlayClose = async () => {
        onClose();
    };
    //changtitle

    const handleSaveTitle = async () => {
        setEditTitle(false);

        const updatedCard = {
            ...card,
            title: editedTitle,
            labels: selectedLabels,
            description: editedDesciption,
            dueDate: formatDate(date)
        };
        onUpdate(updatedCard, listId);
    };
    //checklist
    const fetchChecklists = async () => {
        setLoadingChecklist(true);
        try {
            const res = await fetch(
                `http://localhost:3000/api/cards/${card.id}/checklists`,
                {
                    headers: {
                        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                    },
                }
            );
            const data = await res.json();
            setChecklists(data);
        } catch (err) {
            console.error("Load checklist failed:", err);
        } finally {
            setLoadingChecklist(false);
        }
    };

    useEffect(() => {
        if (!card?.id) return;
        fetchChecklists();
    }, [card.id]);



    useEffect(() => {
        const handler = ({ cardId }) => {
            if (cardId === card.id) {
                fetchChecklists();
            }
        };

        socket.on("CHECKLIST_UPDATED", handler);

        return () => {
            socket.off("CHECKLIST_UPDATED", handler);
        };
    }, [card.id]);
    //toggle Item in Checklist
    const toggleItem = async (itemId) => {
        try {
            await fetch(
                `http://localhost:3000/api/checklist-items/${itemId}/toggle`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                    },
                }
            );
        } catch (err) {
            console.error("Toggle checklist item failed:", err);
        }
    };

    const addChecklistItem = async (checklistId) => {
        const text = newItemText[checklistId];
        if (!text || !text.trim()) return;

        try {
            await fetch(
                `http://localhost:3000/api/checklists/${checklistId}/items`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                    },
                    body: JSON.stringify({ description: text.trim() }),
                }
            );

            setNewItemText(prev => ({ ...prev, [checklistId]: "" }));
        } catch (err) {
            console.error("Add checklist item failed:", err);
        }
    };
    ////comment and notifications
    useEffect(() => {
        if (!card?.id) return;

        const handler = (activity) => {
            // chỉ nhận activity của card đang mở
            if (activity.target?.cardId === card.id.toString()) {
                setActivities(prev => {
                    if (prev.some(a => a.id === activity.id)) return prev;
                    return [activity, ...prev];
                });
            }
        };

        socket.on("activity_created", handler);

        return () => {
            socket.off("activity_created", handler);
        };
    }, [card.id]);

    const merged = [
        ...comments.map(c => ({ ...c, type: "comment" })),
        ...activities.map(a => ({ ...a, type: "activity" })),
    ].sort(
        (a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );


    return (
        <div className="modal-overlay" onClick={handleOverlayClose}>
            <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
                <div className="header-listName">
                    <h1>{list.title}</h1>
                    <button className="close-x" onClick={handleClose}>✕</button>
                </div>
                <div className="modal-body-wrapper">
                    <div className="modal-left">
                        <div className="modal-content">
                            {!editTitle ? (
                                <div className="modal-header" >
                                    <h2 onClick={() => setEditTitle(true)}>{editedTitle}</h2>
                                </div>
                            ) : (
                                <div className="modal-header">
                                    <input
                                        value={editedTitle}
                                        className="modal-title-input"
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        autoFocus
                                        onBlur={handleSaveTitle}
                                    />
                                </div>
                            )}


                            <div className="modal-body">
                                {selectedLabels.length > 0 && (
                                    <div className="labels">
                                        {selectedLabels.map(label => (
                                            <span
                                                key={label.id}
                                                className="label"
                                                style={{
                                                    backgroundColor: label.color,
                                                    color: "white",
                                                    padding: "5px 10px",
                                                    borderRadius: "5px",
                                                    marginRight: "6px"
                                                }}
                                            >
                                                {label.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="feature">
                                    <button>+ Add</button>
                                    <button onClick={() => setShowLabelPopup(!showLabelPopup)}>Label</button>
                                    <button><img src="/assets/check-circle.svg" /> Checklist</button>
                                    <button><img src="/assets/paperclip.svg" /> Attachment</button>
                                    <button onClick={() => setShowDatePicker(!showDatePicker)}>Due Date</button>
                                    <button onClick={() => setShowMemberPopup(true)}>Members</button>
                                </div>

                                {showMemberPopup && (
                                    <div className="label-popup" onClick={(e) => e.stopPropagation()}>
                                        <h3>Add members</h3>

                                        {boardMembers.map(member => {
                                            const isAdded = card.members?.includes(member.id);

                                            return (
                                                <div
                                                    key={member.id}
                                                    className="label-row"
                                                    onClick={() => handleAddMember(member)}
                                                >
                                                    <span>{member.name}</span>
                                                    {isAdded && <span style={{ marginLeft: "auto" }}><CheckIcon></CheckIcon></span>}
                                                </div>
                                            );
                                        })}


                                        <button onClick={() => setShowMemberPopup(false)}>Close</button>
                                    </div>
                                )}


                                {date && <p><strong>Due:</strong> {formatDate(date)}</p>}

                                {!editDescription ? (
                                    <div className="modal-description">
                                        {editedDesciption || card.description}
                                        <button className="editDescription" onClick={() => setEditDescription(true)}>Edit</button>
                                    </div>
                                ) : (
                                    <div className="modal-description">
                                        <textarea
                                            value={editedDesciption}
                                            onChange={(e) => setEditedDesciption(e.target.value)}
                                        />
                                        <button className="saveDescription" onClick={handleSaveDescription}>Save</button>
                                        <button className="cancelDescription" onClick={() => {
                                            setEditDescription(false);
                                            setEditedDesciption(card.description);
                                        }}>Cancel</button>
                                    </div>
                                )}

                                {loadingChecklist && <p>Loading checklist...</p>}

                                {checklists.map((cl) => (
                                    <div key={cl.checklist_id} className="checklist">
                                        <h4>{cl.title}</h4>

                                        <div
                                            className="progress"
                                            style={{ "--progress": cl.progress }}
                                        >
                                            Progress: {cl.progress}%
                                        </div>


                                        {cl.items.map((item) => (
                                            <div key={item.item_id} className="checklist-item">
                                                <input
                                                    type="checkbox"
                                                    checked={item.is_completed}
                                                    onChange={() => toggleItem(item.item_id)}
                                                />
                                                <span>{item.description}</span>
                                            </div>
                                        ))}

                                        <div className="checklist-add-item">
                                            <input
                                                type="text"
                                                placeholder="Add an item..."
                                                value={newItemText[cl.checklist_id] || ""}
                                                onChange={(e) =>
                                                    setNewItemText(prev => ({
                                                        ...prev,
                                                        [cl.checklist_id]: e.target.value
                                                    }))
                                                }
                                                onKeyDown={(e) =>
                                                    e.key === "Enter" && addChecklistItem(cl.checklist_id)
                                                }
                                            />
                                            <button onClick={() => addChecklistItem(cl.checklist_id)}>
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                ))}


                            </div>
                        </div>
                    </div>


                    <div className="modal-right">
                        <h3 className="activity-title">Comments and activity</h3>

                        <input
                            className="comment-input"
                            placeholder="Write a comment..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />

                        <div className="activity-list">
                            {merged.map(item => {
                                if (item.type === "comment") {
                                    return <CommentItem key={item.id} comment={item} />;
                                }
                                return <ActivityItem key={item.id} activity={item} />;
                            })}


                        </div>
                    </div>
                </div>
            </div>
            {showDatePicker && (
                <div className="calendar-popup" onClick={(e) => e.stopPropagation()}>
                    <Calendar onChange={setDate} value={date} />
                    <div className="calendar-actions">
                        <button onClick={handleSaveDate}>Save</button>
                        <button onClick={handleClear}>Clear</button>
                        <button onClick={() => setShowDatePicker(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {showLabelPopup && (
                <div className="label-popup" onClick={(e) => e.stopPropagation()}>
                    <h3>Labels</h3>

                    {loadingLabels ? (
                        <p>Loading...</p>
                    ) : (
                        <div className="label-list">
                            {allLabels.map(label => {
                                const isSelected = selectedLabels.some(l => l.id === label.id);
                                return (
                                    <div key={label.id} className="label-row">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleLabel(label)}
                                        />
                                        <div
                                            className="label-color-box"
                                            style={{
                                                background: label.color,
                                                width: "90%",
                                                height: "20px",
                                                border: "2px solid gray"
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <button onClick={() => setShowLabelPopup(false)}>Close</button>
                </div>
            )}
        </div>
    );
}

export default CardModal;