import { Button } from "./button";

interface VideoControlsProps {
  currentVideo: number;
  onVideoChange: (videoNumber: number) => void;
}

export function VideoControls({
  currentVideo,
  onVideoChange,
}: VideoControlsProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        gap: "8px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        padding: "12px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {[1, 2, 3, 4].map((num) => (
        <Button
          key={num}
          variant={currentVideo === num ? "default" : "outline"}
          size="sm"
          onClick={() => onVideoChange(num)}
          style={{ minWidth: "70px" }}
        >
          Scène {num}
        </Button>
      ))}
    </div>
  );
}
