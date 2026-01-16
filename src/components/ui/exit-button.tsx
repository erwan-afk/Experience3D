import { useState, useEffect, useRef } from "react";
import { LiquidButton } from "./liquid-glass-button";

interface ExitButtonProps {
  returnUrl?: string;
}

/**
 * Bouton "Sortir de l'expérience" qui apparaît quand on sort du pointer lock ET qu'on bouge la souris
 */
export function ExitButton({ returnUrl = "/" }: ExitButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const isUnlockedRef = useRef(false);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    const showButton = () => {
      setIsVisible(true);
      // Double requestAnimationFrame pour garantir que le DOM est prêt
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1);
        });
      });
    };

    const hideButton = () => {
      setOpacity(0);
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement !== null;

      if (!isLocked) {
        // Sortie du pointer lock - attendre le mouvement de souris
        isUnlockedRef.current = true;
        hasMovedRef.current = false;
      } else {
        // Entrée dans le pointer lock - cacher le bouton et reset
        isUnlockedRef.current = false;
        hasMovedRef.current = false;
        hideButton();
      }
    };

    const handleMouseMove = () => {
      // Afficher seulement si on est sorti du pointer lock et qu'on n'a pas encore affiché
      if (isUnlockedRef.current && !hasMovedRef.current) {
        hasMovedRef.current = true;
        showButton();
      }
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange,
      );
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const handleExit = () => {
    window.location.href = returnUrl;
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        opacity,
        transition: "opacity 0.5s ease-out",
      }}
    >
      <LiquidButton onClick={handleExit} size="lg">
        Sortir de l'expérience
      </LiquidButton>
    </div>
  );
}
