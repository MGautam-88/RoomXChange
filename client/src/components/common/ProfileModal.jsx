import React from "react";
import Button from "./Button.jsx";
import Badge from "./Badge.jsx";

export default function ProfileModal({ user, onClose, onLogout }) {
  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="profile-header-info">
            <div className="profile-avatar-large">{initials}</div>
            <div>
              <h2 className="profile-name">{user.name}</h2>
              <p className="muted" style={{ marginBottom: "4px" }}>{user.email}</p>
              <Badge value={user.role || "user"} />
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body profile-modal-body">
          <div className="profile-section">
            <div className="profile-rooms-container">
              <div className="profile-room-box">
                <span className="eyebrow">Alloted Room</span>
                <span className="profile-room-val mono">{user.allotedRoom || "A101"}</span>
              </div>
              <div className="profile-room-box highlight">
                <span className="eyebrow">Current Room</span>
                <span className="profile-room-val mono accent">{user.currentRoom || user.allotedRoom || "A101"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer profile-modal-footer">
          <Button type="button" variant="danger" onClick={onLogout} style={{ width: "100%" }}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
