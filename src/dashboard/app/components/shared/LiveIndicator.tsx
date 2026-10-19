import React from "react";

export function LiveIndicator({connected}: {connected: boolean}) {
  return (
    <span className="inline-flex items-center gap-1.5 wd-label" style={{ color: "var(--text-secondary)" }}>
      <span className="rounded-full" style={{ width: 8, height: 8, background: "var(--text-secondary)" }} />
      {connected ? "Connected" : "Reconnecting"}
    </span>
  );
}
