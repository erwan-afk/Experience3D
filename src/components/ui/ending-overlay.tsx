import { useState, useEffect } from "react";

interface EndingOverlayProps {
  isActive: boolean;
  onContinue?: () => void;
  onReturn?: () => void;
  returnUrl?: string;
}

/**
 * Overlay de fin avec flou progressif, texte "merci" et popup de choix
 */
export function EndingOverlay({
  isActive,
  onContinue,
  onReturn,
  returnUrl = "/",
}: EndingOverlayProps) {
  const [blurAmount, setBlurAmount] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setBlurAmount(0);
      setTextOpacity(0);
      setShowPopup(false);
      return;
    }

    // Animation du flou progressif
    const startTime = performance.now();
    const blurDuration = 2000; // 2 secondes pour le flou
    const textDelay = 1000; // Le texte apparaît après 1 seconde
    const textDuration = 1500; // 1.5 secondes pour le fade in du texte
    const popupDelay = 3000; // La popup apparaît après 3 secondes
    const maxBlur = 20; // pixels de blur max

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      // Animation du flou
      if (elapsed < blurDuration) {
        const progress = elapsed / blurDuration;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setBlurAmount(easedProgress * maxBlur);
      } else {
        setBlurAmount(maxBlur);
      }

      // Animation du texte (avec délai)
      if (elapsed > textDelay) {
        const textElapsed = elapsed - textDelay;
        if (textElapsed < textDuration) {
          const textProgress = textElapsed / textDuration;
          const easedTextProgress = 1 - Math.pow(1 - textProgress, 2);
          setTextOpacity(easedTextProgress);
        } else {
          setTextOpacity(1);
        }
      }

      // Afficher la popup après le délai
      if (elapsed > popupDelay && !showPopup) {
        setShowPopup(true);
      }

      // Continuer l'animation si pas finie
      if (
        elapsed < blurDuration ||
        elapsed < textDelay + textDuration ||
        elapsed < popupDelay
      ) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isActive]);

  const handleContinue = () => {
    setBlurAmount(0);
    setTextOpacity(0);
    setShowPopup(false);
    onContinue?.();
  };

  const handleReturn = () => {
    if (onReturn) {
      onReturn();
    } else {
      window.location.href = returnUrl;
    }
  };

  if (!isActive && blurAmount === 0) return null;

  return (
    <>
      {/* Overlay de flou sur le canvas */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
          pointerEvents: "none",
          zIndex: 100,
        }}
      />

      {/* Texte "merci" et popup */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: showPopup ? "auto" : "none",
          zIndex: 101,
          gap: "3rem",
        }}
      >
        <span
          style={{
            fontFamily: "Satoshi, sans-serif",
            fontSize: "clamp(3rem, 10vw, 8rem)",
            fontWeight: 400,
            color: "white",
            opacity: textOpacity,
          }}
        >
          Merci
        </span>

        {/* Popup de choix */}
        {showPopup && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
              padding: "2rem 3rem",
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              opacity: textOpacity,
              animation: "fadeInUp 0.5s ease-out",
            }}
          >
            <span
              style={{
                fontFamily: "Satoshi, sans-serif",
                fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
                fontWeight: 400,
                color: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
              }}
            >
              Que souhaitez-vous faire ?
            </span>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleContinue}
                style={{
                  fontFamily: "Satoshi, sans-serif",
                  fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
                  fontWeight: 500,
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "0.5rem",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.3)";
                }}
              >
                Continuer à explorer
              </button>

              <button
                onClick={handleReturn}
                style={{
                  fontFamily: "Satoshi, sans-serif",
                  fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
                  fontWeight: 500,
                  padding: "0.75rem 1.5rem",
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "none",
                  borderRadius: "0.5rem",
                  color: "black",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                }}
              >
                Retourner au site
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
