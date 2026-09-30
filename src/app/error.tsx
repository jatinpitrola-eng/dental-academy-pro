"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the full error so we can see it in the browser console.
    console.error("PRODUCTION ERROR CAPTURED:", error);
    console.error("Stack:", error.stack);
    console.error("Digest:", error.digest);
  }, [error]);

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", fontSize: "13px", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ color: "#dc2626", marginBottom: "1rem" }}>⚠️ Error captured</h2>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Message:</strong> {error.message || "(no message)"}
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Digest:</strong> {error.digest || "(none)"}
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Name:</strong> {error.name}
      </div>
      <pre style={{ background: "#f3f4f6", padding: "1rem", borderRadius: "8px", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {error.stack || "(no stack trace)"}
      </pre>
      <button
        onClick={reset}
        style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
