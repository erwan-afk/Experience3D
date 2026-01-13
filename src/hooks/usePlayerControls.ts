import { useState, useEffect } from 'react';

interface Movement {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}

const keys: Record<string, keyof Movement> = {
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'forward',
  ArrowDown: 'backward',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * Hook pour gérer les contrôles du joueur (WASD + Espace)
 */
export function usePlayerControls(): Movement {
  const [movement, setMovement] = useState<Movement>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = keys[e.code];
      if (key) {
        setMovement((m) => ({ ...m, [key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = keys[e.code];
      if (key) {
        setMovement((m) => ({ ...m, [key]: false }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return movement;
}
