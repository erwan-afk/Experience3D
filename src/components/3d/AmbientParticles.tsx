import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ParticleEffectType } from "../../types/particles";

// Précharger le modèle
useGLTF.preload("/small_rocks.glb");

// Composant pour les cailloux qui tombent (éboulement)
function FallingRocks({
  enabled = true,
  opacity = 1,
}: {
  enabled?: boolean;
  opacity?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rocksCount = 500;

  // Charger le modèle GLB
  const { nodes, materials } = useGLTF("/small_rocks.glb");

  // Extraire les géométries des meshes du modèle
  const rockGeometries = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];

    Object.values(nodes).forEach((node) => {
      if (node instanceof THREE.Mesh && node.geometry) {
        geometries.push(node.geometry);
      }
    });

    // S'assurer qu'on a au moins une géométrie
    if (geometries.length === 0) {
      console.warn("Aucune géométrie trouvée dans small-rocks.glb");
      geometries.push(new THREE.IcosahedronGeometry(1, 0));
    }

    return geometries;
  }, [nodes]);

  // Extraire le matériau du modèle
  const rockMaterial = useMemo(() => {
    const mat = Object.values(materials)[0];
    if (mat instanceof THREE.Material) {
      const cloned = mat.clone();
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.transparent = false;
        cloned.opacity = 1;
      }
      return cloned;
    }
    return new THREE.MeshStandardMaterial({
      color: "#808080",
      roughness: 0.9,
      transparent: false,
    });
  }, [materials]);

  // Données des cailloux
  const rocksData = useMemo(() => {
    const data = [];
    for (let i = 0; i < rocksCount; i++) {
      // Les premiers 30% sont gros, les autres sont petits
      const isBigRock = i < rocksCount * 0.3;
      const scale = isBigRock
        ? 0.004 + Math.random() * 0.006 // Gros cailloux
        : 0.001 + Math.random() * 0.002; // Petits cailloux

      // Les gros tombent en premier (delay court), les petits après
      const delay = isBigRock
        ? Math.random() * 2 // 0-2s pour les gros
        : 2 + Math.random() * 6; // 2-8s pour les petits

      data.push({
        x: -4 + Math.random() * 8,
        z: -4 + Math.random() * 8,
        startY: 10 + Math.random() * 5,
        scale,
        delay,
        isBigRock,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5,
          z: (Math.random() - 0.5) * 5,
        },
        initialRotation: {
          x: Math.random() * Math.PI * 2,
          y: Math.random() * Math.PI * 2,
          z: Math.random() * Math.PI * 2,
        },
        geometryIndex: Math.floor(Math.random() * rockGeometries.length),
      });
    }
    return data;
  }, [rockGeometries.length]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const gravity = 15;
    const groundY = 0.1;

    groupRef.current.children.forEach((rock, i) => {
      const data = rocksData[i];
      const rockAny = rock as any;

      // Initialiser les propriétés de physique
      if (rockAny.vy === undefined) {
        rockAny.vy = 0;
        rockAny.vx = 0;
        rockAny.vz = 0;
        rockAny.time = 0;
        rockAny.onGround = false;
      }

      rockAny.time += delta;

      // Attendre le delay
      if (rockAny.time < data.delay) {
        return;
      }

      if (!rockAny.onGround) {
        // En chute - appliquer gravité
        rockAny.vy -= gravity * delta;
        rock.position.y += rockAny.vy * delta;

        // Rotation en l'air
        rock.rotation.x += data.rotationSpeed.x * delta;
        rock.rotation.y += data.rotationSpeed.y * delta;
        rock.rotation.z += data.rotationSpeed.z * delta;

        // Impact au sol
        if (rock.position.y <= groundY) {
          rock.position.y = groundY;
          rockAny.onGround = true;

          // Vitesse horizontale avec direction aléatoire (glissement)
          const impact = Math.min(Math.abs(rockAny.vy), 15);
          const angle = Math.random() * Math.PI * 2; // Direction aléatoire 360°
          const force = impact * (0.3 + Math.random() * 0.4);
          rockAny.vx = Math.cos(angle) * force;
          rockAny.vz = Math.sin(angle) * force;
          rockAny.vy = 0;
          rockAny.groundTime = 0;
        }
      } else {
        // Au sol - roulement
        rockAny.groundTime += delta;

        // Friction
        rockAny.vx *= 0.98;
        rockAny.vz *= 0.98;

        // Déplacement
        rock.position.x += rockAny.vx * delta;
        rock.position.z += rockAny.vz * delta;

        // Rotation liée au mouvement
        rock.rotation.x += rockAny.vx * 3 * delta;
        rock.rotation.z += rockAny.vz * 3 * delta;

        // Limites
        rock.position.x = Math.max(-6, Math.min(6, rock.position.x));
        rock.position.z = Math.max(-6, Math.min(6, rock.position.z));

        // Les cailloux restent au sol une fois arrêtés
      }
    });
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {rocksData.map((rock, i) => (
        <mesh
          key={i}
          geometry={rockGeometries[rock.geometryIndex]}
          material={rockMaterial.clone()}
          position={[rock.x, rock.startY, rock.z]}
          scale={rock.scale}
          rotation={[
            rock.initialRotation.x,
            rock.initialRotation.y,
            rock.initialRotation.z,
          ]}
        />
      ))}
    </group>
  );
}

// Shader pour l'herbe avec éclairage similaire aux rocks (ambientLight: 0.1)
class GrassMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        fTime: { value: 0.0 },
        fGrowth: { value: 0.0 },
        vPlayerPosition: { value: new THREE.Vector3(0.0, -100.0, 0.0) },
        fPlayerColliderRadius: { value: 4.0 }, // Rayon d'interaction avec le joueur (herbe se penche)
      },
      vertexShader: `
        uniform float fTime;
        uniform float fGrowth;
        uniform vec3 vPlayerPosition;
        uniform float fPlayerColliderRadius;

        varying float vHeightFactor;
        varying vec3 vInstanceCol;
        varying vec3 vWorldPos;

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float createNoise(vec2 n) {
          vec2 d = vec2(0.0, 1.0);
          vec2 b = floor(n);
          vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
          return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
        }

        void main() {
          vInstanceCol = instanceColor;

          // Position monde (avant croissance)
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);

          // Croissance individuelle par brin
          float growthDelay = instanceColor.g * 25.0;
          float growthDuration = 12.0;
          float individualGrowth = clamp((fGrowth * 37.0 - growthDelay) / growthDuration, 0.0, 1.0);

          // Smootherstep
          individualGrowth = individualGrowth * individualGrowth * individualGrowth * (individualGrowth * (individualGrowth * 6.0 - 15.0) + 10.0);

          // Hauteur finale variable
          float maxHeightFactor = 0.4 + instanceColor.b * 0.6;
          individualGrowth *= maxHeightFactor;

          vHeightFactor = position.y * 2.0 * individualGrowth;
          float distFromGround = max(0.0, position.y) * individualGrowth;

          // Appliquer croissance
          worldPos.y *= individualGrowth;

          // Bruit
          float noise = createNoise(vec2(worldPos.x * 0.5, worldPos.z * 0.5)) * 0.6 + 0.4;

          // Vent
          float swayX = sin(fTime * 1.5 + worldPos.x * 0.5) * noise * distFromGround * 0.15 * individualGrowth;
          float swayZ = cos(fTime * 1.2 + worldPos.z * 0.5) * noise * distFromGround * 0.1 * individualGrowth;

          // Interaction joueur
          float distanceFromPlayer = length(vPlayerPosition.xz - worldPos.xz);
          vec3 playerDir = normalize(vec3(worldPos.x - vPlayerPosition.x, 0.0, worldPos.z - vPlayerPosition.z));
          float fOffset = max(0.0, fPlayerColliderRadius - distanceFromPlayer);

          worldPos.x += swayX + playerDir.x * fOffset * distFromGround * 0.5;
          worldPos.z += swayZ + playerDir.z * fOffset * distFromGround * 0.5;

          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying float vHeightFactor;
        varying vec3 vInstanceCol;
        varying vec3 vWorldPos;

        void main() {
          // Cacher les brins qui n'ont pas encore poussé
          if (vHeightFactor < 0.01) {
            discard;
          }

          // Dégradé de vert
          vec3 darkGreen = vec3(0.02, 0.05, 0.01);
          vec3 brightGreen = vec3(0.08, 0.2, 0.06);
          vec3 baseColor = mix(darkGreen, brightGreen, clamp(vHeightFactor, 0.0, 1.0));

          // Variation par instance
          baseColor *= 0.8 + vInstanceCol.r * 0.4;

          // Éclairage ambient (similaire à la scène: intensity 0.1)
          float ambientIntensity = 0.1;
          vec3 finalColor = baseColor * (0.15 + ambientIntensity * 2.5);

          // Légère variation positionnelle
          finalColor *= 0.95 + 0.1 * sin(vWorldPos.x * 3.0 + vWorldPos.z * 3.0);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }
}

// Composant pour l'herbe qui pousse avec InstancedMesh
function GrowingGrass({
  enabled = true,
  opacity = 1,
}: {
  enabled?: boolean;
  opacity?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const grassCount = 15000;
  const startTimeRef = useRef<number | null>(null);

  // Créer la géométrie d'un brin d'herbe courbé avec plusieurs segments
  const grassGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const segments = 5; // Nombre de segments verticaux
    const height = 0.5;
    const width = 0.025;
    const bendStrength = 0.15; // Force de courbure

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Créer les vertices avec une courbure progressive
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * height;
      // Courbure quadratique - plus courbé en haut
      const bend = t * t * bendStrength;
      // Largeur qui diminue vers le haut
      const w = width * (1 - t * 0.8);

      // Vertex gauche
      vertices.push(-w, y, bend);
      uvs.push(0, t); // UV gauche
      // Vertex droit
      vertices.push(w, y, bend);
      uvs.push(1, t); // UV droit
    }

    // Créer les triangles (faces)
    for (let i = 0; i < segments; i++) {
      const bl = i * 2; // bas gauche
      const br = i * 2 + 1; // bas droit
      const tl = (i + 1) * 2; // haut gauche
      const tr = (i + 1) * 2 + 1; // haut droit

      // Triangle 1
      indices.push(bl, br, tl);
      // Triangle 2
      indices.push(br, tr, tl);
    }

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(vertices), 3),
    );
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, []);

  // Matériau shader pour l'herbe
  const grassMaterial = useMemo(() => new GrassMaterial(), []);

  // Initialiser les instances avec délais de croissance aléatoires
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < grassCount; i++) {
      // Position aléatoire dans la zone (élargie)
      const x = -5 + Math.random() * 10;
      const z = -5 + Math.random() * 10;

      dummy.position.set(x, 0, z);
      // Rotation Y aléatoire (direction) + légères inclinaisons X et Z (penché)
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.5, // Inclinaison X (-0.25 à 0.25 rad)
        Math.random() * Math.PI * 2, // Direction Y (0 à 360°)
        (Math.random() - 0.5) * 0.5, // Inclinaison Z (-0.25 à 0.25 rad)
      );
      dummy.scale.setScalar(0.6 + Math.random() * 0.8);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);

      // instanceColor: r = variation couleur, g = délai de croissance (0-1), b = unused
      mesh.setColorAt(
        i,
        new THREE.Color(
          Math.random(), // Variation de couleur
          Math.random(), // Délai de croissance (0-1, multiplié par 6s dans le shader)
          Math.random(), // Réservé
        ),
      );
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [grassCount]);

  // Animation
  useFrame((state) => {
    if (!enabled) return;

    // Démarrer le timer au premier frame actif
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    if (!meshRef.current) return;

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const material = meshRef.current.material as GrassMaterial;

    // Croissance globale sur 37 secondes (le shader gère les délais individuels)
    const growth = Math.min(1, elapsed / 37);
    material.uniforms.fGrowth.value = growth;
    material.uniforms.fTime.value = state.clock.elapsedTime;

    // Position du joueur (caméra)
    material.uniforms.vPlayerPosition.value.copy(state.camera.position);
  });

  if (!enabled) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[grassGeometry, grassMaterial, grassCount]}
      frustumCulled={false}
    />
  );
}

interface AmbientParticlesProps {
  effect: ParticleEffectType;
  enabled?: boolean;
  opacity?: number;
}

// Zone où les particules ambiantes flottent (carré d'interaction)
const AMBIENT_BOUNDS = {
  minX: -5,
  maxX: 5,
  minY: 0.2,
  maxY: 12,
  minZ: -5,
  maxZ: 5,
};

// Configuration par effet
const EFFECT_CONFIG: Record<
  string,
  { color: string; size: number; riseSpeed: number; count: number }
> = {
  stars: { color: "#ffffff", size: 0.015, riseSpeed: 0, count: 600 },
  fireflies: { color: "#ff4400", size: 0.03, riseSpeed: 0.3, count: 800 },
  snow: { color: "#ffffff", size: 0.02, riseSpeed: -0.2, count: 500 },
  dust: { color: "#d4a574", size: 0.02, riseSpeed: 0.1, count: 600 },
  energy: { color: "#00ffff", size: 0.025, riseSpeed: 0.4, count: 700 },
  rocks: { color: "#a08060", size: 0.15, riseSpeed: 0, count: 300 }, // Éboulement - cailloux qui tombent
};

/**
 * Particules ambiantes qui flottent dans l'espace 3D
 */
export function AmbientParticles({
  effect,
  enabled = true,
  opacity = 1,
}: AmbientParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const effectConfig = EFFECT_CONFIG[effect] || EFFECT_CONFIG.stars;
  const particleCount = effectConfig.count;

  // Texture circulaire pour particules normales
  const circleTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Texture de caillou irrégulière
  const rockTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    // Forme de caillou irrégulière
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(52, 18);
    ctx.lineTo(58, 35);
    ctx.lineTo(48, 52);
    ctx.lineTo(28, 56);
    ctx.lineTo(12, 48);
    ctx.lineTo(6, 30);
    ctx.lineTo(15, 14);
    ctx.closePath();

    // Dégradé pour donner du volume
    const gradient = ctx.createRadialGradient(28, 28, 0, 32, 32, 30);
    gradient.addColorStop(0, "rgba(180, 160, 140, 1)");
    gradient.addColorStop(0.5, "rgba(120, 100, 80, 1)");
    gradient.addColorStop(1, "rgba(60, 50, 40, 0.8)");
    ctx.fillStyle = gradient;
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }, []);

  const texture = effect === "rocks" ? rockTexture : circleTexture;

  // Données des particules avec phase pour animation
  const { positions, originalPositions, phases } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const origPos = new Float32Array(particleCount * 3);
    const pha = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const x =
        AMBIENT_BOUNDS.minX +
        Math.random() * (AMBIENT_BOUNDS.maxX - AMBIENT_BOUNDS.minX);
      const y =
        AMBIENT_BOUNDS.minY +
        Math.random() * (AMBIENT_BOUNDS.maxY - AMBIENT_BOUNDS.minY);
      const z =
        AMBIENT_BOUNDS.minZ +
        Math.random() * (AMBIENT_BOUNDS.maxZ - AMBIENT_BOUNDS.minZ);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;

      pha[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, originalPositions: origPos, phases: pha };
  }, [particleCount]);

  // Animation selon l'effet
  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current) return;

    materialRef.current.opacity = opacity;

    const time = state.clock.elapsedTime;
    const posArray = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const height = AMBIENT_BOUNDS.maxY - AMBIENT_BOUNDS.minY;

    for (let i = 0; i < particleCount; i++) {
      const phase = phases[i];
      const origX = originalPositions[i * 3];
      const origY = originalPositions[i * 3 + 1];
      const origZ = originalPositions[i * 3 + 2];

      if (effect === "stars") {
        // Étoiles : scintillement léger, quasi statiques
        const twinkle = Math.sin(time * 2 + phase) * 0.02;
        posArray[i * 3] = origX + twinkle;
        posArray[i * 3 + 1] = origY;
        posArray[i * 3 + 2] = origZ + twinkle;
      } else if (effect === "rocks") {
        // Éboulement : chute avec gravité réaliste (g = 9.8 m/s²)
        const gravity = 9.8;
        const startDelay = phase * 0.5; // Décalage temporel par caillou (0 à ~3s)
        const fallTime = Math.max(0, time - startDelay);

        // Position Y avec accélération gravitationnelle: y = y0 - 0.5 * g * t²
        const fallDistance = 0.5 * gravity * fallTime * fallTime;
        let newY = AMBIENT_BOUNDS.maxY - fallDistance;

        // Reboucler quand le caillou touche le sol
        if (newY < AMBIENT_BOUNDS.minY) {
          // Calculer le temps pour un cycle complet de chute
          const fallDuration = Math.sqrt((2 * height) / gravity);
          const cycleTime = fallTime % (fallDuration + 0.5); // +0.5s de pause au sol
          if (cycleTime < fallDuration) {
            const newFallDistance = 0.5 * gravity * cycleTime * cycleTime;
            newY = AMBIENT_BOUNDS.maxY - newFallDistance;
          } else {
            newY = AMBIENT_BOUNDS.minY;
          }
        }

        // Léger mouvement latéral pendant la chute (résistance air)
        const drift = Math.sin(fallTime * 2 + phase) * 0.15;
        const sway = Math.cos(fallTime * 1.5 + phase * 2) * 0.1;

        posArray[i * 3] = origX + drift;
        posArray[i * 3 + 1] = newY;
        posArray[i * 3 + 2] = origZ + sway;
      } else {
        // Autres effets : montée/descente avec oscillation
        const riseSpeed = effectConfig.riseSpeed;
        let newY;

        if (riseSpeed !== 0) {
          newY =
            AMBIENT_BOUNDS.minY +
            ((origY -
              AMBIENT_BOUNDS.minY +
              time * Math.abs(riseSpeed) +
              phase) %
              height);
          if (riseSpeed < 0) {
            newY = AMBIENT_BOUNDS.maxY - (newY - AMBIENT_BOUNDS.minY);
          }
        } else {
          newY = origY;
        }

        const drift = Math.sin(time * 0.5 + phase) * 0.2;
        const sway = Math.cos(time * 0.3 + phase) * 0.15;

        posArray[i * 3] = origX + drift;
        posArray[i * 3 + 1] = newY;
        posArray[i * 3 + 2] = origZ + sway;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (effect === "none") return null;

  // Utiliser le composant FallingRocks pour l'effet rocks
  if (effect === "rocks") {
    return <FallingRocks enabled={enabled} opacity={opacity} />;
  }

  // Utiliser le composant GrowingGrass pour l'effet grass
  if (effect === "grass") {
    return <GrowingGrass enabled={enabled} opacity={opacity} />;
  }

  return (
    <points ref={pointsRef} visible={enabled}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={effectConfig.size}
        color={effectConfig.color}
        transparent
        opacity={opacity}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={texture}
      />
    </points>
  );
}
