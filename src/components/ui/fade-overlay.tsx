interface FadeOverlayProps {
  opacity: number;
}

export function FadeOverlay({ opacity }: FadeOverlayProps) {
  if (opacity === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        // Dégradé radial pour un effet plus cinématique
        background: `radial-gradient(ellipse at center,
          rgba(0, 0, 0, ${opacity * 0.85}) 0%,
          rgba(0, 0, 0, ${opacity}) 100%)`,
        pointerEvents: "none",
        zIndex: 50,
        transition: "opacity 100ms ease-out",
      }}
    />
  );
}
