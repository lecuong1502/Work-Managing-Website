// components/CommentItem.jsx
import React from "react";

const CommentItem = ({ comment }) => {
    const sender = comment.sender || { name: "Unknown" };

    const avatarLetter = sender.name ? sender.name.charAt(0).toUpperCase() : "?";

    return (
        <div className="activity-item comment-item">
            <div className="avatar">
                {avatarLetter}
            </div>

            <div className="activity-content">
                <div className="activity-header">
                    <span className="activity-user">
                        {sender.name}
                    </span>
                    <span className="activity-time">
                        {new Date(comment.createdAt).toLocaleString()}
                    </span>
                </div>

                <div className="activity-text">
                    {comment.message}
                </div>
            </div>
        </div>
    );
};

export default CommentItem;
