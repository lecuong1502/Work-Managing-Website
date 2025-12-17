import React from "react";

const ActivityItem = ({ activity }) => {
    const actor = activity.actor || activity.sender || {};

    return (
        <div className="activity-item">
            <div className="avatar">
                {actor.avatar ? (
                    actor.name?.[0] || "U"
                ) : (
                    actor.name?.[0] || "U"
                )}
            </div>

            <div className="activity-content">
                <div className="activity-header">
                    <span className="activity-user">
                        {actor.name || "Unknown"}
                    </span>
                    <span className="activity-time">just now</span>
                </div>

                <div className="activity-text">
                    {activity.message}
                </div>
            </div>
        </div>
    );
};

export default ActivityItem;
