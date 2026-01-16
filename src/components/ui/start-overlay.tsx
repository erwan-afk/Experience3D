interface StartOverlayProps {
  onStart: () => void;
  visible: boolean;
}

export function StartOverlay({ onStart, visible }: StartOverlayProps) {
  if (!visible) return null;

  return (
    <div
      onClick={onStart}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 100,
      }}
    >
      <div style={{ textAlign: "center", color: "white" }}>
        <div
          style={{
            fontSize: "4rem",
            marginBottom: "1.5rem",
            filter: "drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))",
          }}
        >
          ▶
        </div>
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: 300,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Cliquez pour démarrer l'expérience
        </div>
      </div>
    </div>
  );
}
