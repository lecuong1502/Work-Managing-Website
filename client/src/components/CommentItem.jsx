// components/CommentItem.jsx
import React from "react";

const CommentItem = ({ comment }) => {
    return (
        <div className="activity-item comment-item">
            <div className="avatar">
                {comment.user.name[0]}
            </div>

            <div className="activity-content">
                <div className="activity-header">
                    <span className="activity-user">
                        {comment.user.name}
                    </span>
                    <span className="activity-time">
                        {new Date(comment.createdAt).toLocaleString()}
                    </span>
                </div>

                <div className="activity-text">
                    {comment.text}
                </div>
            </div>
        </div>
    );
};

export default CommentItem;
