import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ParticleEffectType } from "../../types/particles";
import { particleEffects } from "../../config/particles.config";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originalX: number;
  originalY: number;
  size: number;
  color: string;
  phase: number;
}

interface ParticleAnimationProps {
  effect: ParticleEffectType;
  width?: number;
  height?: number;
}

/**
 * Animation de particules rendue sur un canvas 2D
 * Retourne une texture utilisable sur l'écran U
 */
export function useParticleTexture({
  effect,
  width = 2048,
  height = 512,
}: ParticleAnimationProps): THREE.CanvasTexture | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false });
  const timeRef = useRef(0);

  const config = particleEffects[effect];

  // Créer le canvas et la texture
  useEffect(() => {
    if (effect === "none") return;

    // Créer le canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    // Initialiser le fond selon l'effet
    const initialBgColors: Record<string, string> = {
      dust: "#3e2f23", // Sable foncé
      fireflies: "#000000",
      snow: "#000000",
      stars: "#000000",
      energy: "#000000",
      none: "#000000",
    };
    ctx.fillStyle = initialBgColors[effect] || "#000000";
    ctx.fillRect(0, 0, width, height);

    // Créer la texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = texture;

    // Initialiser les particules
    const colorOptions = Array.isArray(config.color)
      ? config.color
      : [config.color];

    particlesRef.current = [];
    for (let i = 0; i < config.particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particlesRef.current.push({
        x,
        y,
        vx: 0,
        vy: 0,
        originalX: x,
        originalY: y,
        size: config.size * 20 * (0.5 + Math.random() * 0.5),
        color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Écouter la position de la souris pour l'interaction
    const handleMouseMove = (e: MouseEvent) => {
      // Convertir la position de la souris en coordonnées normalisées (0-1)
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = e.clientY / window.innerHeight;
      mouseRef.current.active = true;
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      texture.dispose();
    };
  }, [effect, width, height, config]);

  // Mettre à jour l'animation à chaque frame
  useFrame((state, delta) => {
    if (
      effect === "none" ||
      !canvasRef.current ||
      !ctxRef.current ||
      !textureRef.current
    )
      return;

    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const particles = particlesRef.current;
    const time = (timeRef.current += delta);

    // Effacer avec un fond semi-transparent pour effet de traînée
    // Couleur de fond selon l'effet
    const bgColors: Record<string, string> = {
      dust: "rgba(62, 47, 35, 0.15)", // Sable foncé
      fireflies: "rgba(0, 0, 0, 0.15)",
      snow: "rgba(0, 0, 0, 0.15)",
      stars: "rgba(0, 0, 0, 0.15)",
      energy: "rgba(0, 0, 0, 0.15)",
      none: "rgba(0, 0, 0, 0.15)",
    };
    ctx.fillStyle = bgColors[effect] || "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Position de la souris en pixels sur le canvas
    const mouseX = mouseRef.current.x * canvas.width;
    const mouseY = mouseRef.current.y * canvas.height;
    const forceRadius = config.forceFieldRadius * 100;
    const forceStrength = config.forceFieldStrength * 50;

    // Mettre à jour et dessiner chaque particule
    for (const particle of particles) {
      // Appliquer le champ de force (répulsion de la souris)
      if (mouseRef.current.active) {
        const dx = particle.x - mouseX;
        const dy = particle.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < forceRadius && dist > 0) {
          const force = ((forceRadius - dist) / forceRadius) * forceStrength;
          particle.vx += (dx / dist) * force;
          particle.vy += (dy / dist) * force;
        }
      }

      // Retour élastique vers la position originale
      particle.vx += (particle.originalX - particle.x) * 0.01;
      particle.vy += (particle.originalY - particle.y) * 0.01;

      // Friction
      particle.vx *= 0.95;
      particle.vy *= 0.95;

      // Animation spécifique à l'effet
      switch (effect) {
        case "fireflies":
          particle.x +=
            Math.sin(time * 2 + particle.phase) * 0.5 * config.speed;
          particle.y +=
            Math.cos(time * 1.5 + particle.phase) * 0.3 * config.speed;
          break;

        case "snow":
          particle.y += config.speed * 2;
          particle.x += Math.sin(time + particle.phase) * 0.5;
          if (particle.y > canvas.height) {
            particle.y = 0;
            particle.x = particle.originalX;
          }
          break;

        case "stars":
          // Les étoiles ne bougent pas, juste scintillent
          break;

        case "dust":
          // Effet de vagues - les particules montent et descendent en vagues
          const waveFreq = 0.8;
          const waveAmp = 30; // Amplitude en pixels
          const waveSpeed = time * config.speed;
          // Vague basée sur la position X pour créer des ondulations horizontales
          const waveOffset =
            particle.originalX * 0.01 + particle.originalY * 0.005;
          particle.y =
            particle.originalY +
            Math.sin(waveSpeed * waveFreq + waveOffset + particle.phase) *
              waveAmp;
          // Léger mouvement horizontal
          particle.x =
            particle.originalX +
            Math.sin(waveSpeed * 0.3 + particle.phase) * 10;
          break;

        case "energy":
          const angle = time * config.speed + particle.phase;
          particle.x = particle.originalX + Math.cos(angle) * 20;
          particle.y = particle.originalY + Math.sin(angle * 2) * 10;
          break;
      }

      // Appliquer la vélocité
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Garder dans les limites
      particle.x = Math.max(0, Math.min(canvas.width, particle.x));
      particle.y = Math.max(0, Math.min(canvas.height, particle.y));

      // Dessiner la particule
      const alpha =
        effect === "stars"
          ? 0.5 + 0.5 * Math.sin(time * 3 + particle.phase)
          : effect === "fireflies"
            ? 0.6 + 0.4 * Math.sin(time * 4 + particle.phase)
            : 0.8;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Glow effect
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 2,
      );
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Marquer la texture comme nécessitant une mise à jour
    textureRef.current.needsUpdate = true;
  });

  return textureRef.current;
}
