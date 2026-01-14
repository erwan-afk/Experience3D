import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useControls } from "leva";
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { ParticleEffectType } from "../../types/particles";

// Précharger les modèles
useGLTF.preload("/small_rocks.glb");
useGLTF.preload("/butterfly.glb");

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
// Nombre maximum de lumières de fleurs supportées
const MAX_FLOWER_LIGHTS = 30;

class GrassMaterial extends THREE.ShaderMaterial {
  constructor() {
    // Créer un array de Vector3 pour les positions des lumières
    const flowerLightPositions: THREE.Vector3[] = [];
    const flowerLightIntensities: number[] = [];
    for (let i = 0; i < MAX_FLOWER_LIGHTS; i++) {
      flowerLightPositions.push(new THREE.Vector3(0, -100, 0)); // Position hors vue par défaut
      flowerLightIntensities.push(0); // Intensité 0 par défaut
    }

    super({
      uniforms: {
        fTime: { value: 0.0 },
        fGrowth: { value: 0.0 },
        vPlayerPosition: { value: new THREE.Vector3(0.0, -100.0, 0.0) },
        fPlayerColliderRadius: { value: 4.0 },
        // Uniforms pour les lumières des fleurs
        uFlowerLightPositions: { value: flowerLightPositions },
        uFlowerLightIntensities: { value: flowerLightIntensities },
        uFlowerLightColor: { value: new THREE.Color("#eac301") },
        uFlowerLightBaseIntensity: { value: 0.02 },
        uFlowerLightDistance: { value: 9.0 },
        uFlowerLightCount: { value: 0 },
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
        uniform vec3 uFlowerLightPositions[${MAX_FLOWER_LIGHTS}];
        uniform float uFlowerLightIntensities[${MAX_FLOWER_LIGHTS}];
        uniform vec3 uFlowerLightColor;
        uniform float uFlowerLightBaseIntensity;
        uniform float uFlowerLightDistance;
        uniform int uFlowerLightCount;

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

          // Calcul de l'éclairage des fleurs
          vec3 flowerLightContribution = vec3(0.0);
          for (int i = 0; i < ${MAX_FLOWER_LIGHTS}; i++) {
            if (i >= uFlowerLightCount) break;

            vec3 lightPos = uFlowerLightPositions[i];
            float lightIntensity = uFlowerLightIntensities[i];
            float dist = length(lightPos - vWorldPos);

            // Atténuation quadratique avec distance max
            if (dist < uFlowerLightDistance && lightIntensity > 0.0) {
              float normalizedDist = dist / uFlowerLightDistance;
              // Atténuation douce: decay quadratique
              float attenuation = 1.0 - normalizedDist;
              attenuation = attenuation * attenuation;

              // Contribution de cette lumière (avec intensité individuelle basée sur la croissance)
              flowerLightContribution += uFlowerLightColor * uFlowerLightBaseIntensity * lightIntensity * attenuation;
            }
          }

          // Ajouter la contribution des lumières des fleurs
          finalColor += baseColor * flowerLightContribution * 15.0;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }
}

// Simplex noise simplifié pour le vol du papillon
class SimplexNoise {
  noise(x: number, y: number, z: number) {
    return (
      Math.sin(x * 1.7 + y * 9.2 + z * 3.1) * 0.5 +
      Math.sin(x * 8.3 + y * 2.8 + z * 5.7) * 0.25
    );
  }
}

const noise = new SimplexNoise();

// Composant pour le papillon qui vole
function Butterfly({ enabled = true }: { enabled?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/butterfly.glb");
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // État du papillon - physique de steering
  const pathDataRef = useRef({
    pos: new THREE.Vector3(0, 2, 0),
    vel: new THREE.Vector3(0.4, 0, 0),
    dir: new THREE.Vector3(1, 0, 0),
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  });

  // Cloner la scène avec SkeletonUtils pour préserver le squelette
  const butterflyModel = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    return cloned;
  }, [scene]);

  // Initialiser l'animation du modèle
  useEffect(() => {
    if (!butterflyModel) return;

    if (animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(butterflyModel);

      // Jouer l'animation "Flying"
      const flyingClip = animations.find((clip) => clip.name === "Flying");
      if (flyingClip) {
        const action = mixerRef.current.clipAction(flyingClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.timeScale = 1.5;
        action.play();
      }
    }

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [butterflyModel, animations]);

  useFrame((state, delta) => {
    if (!groupRef.current || !enabled) return;

    // Démarrer le timer
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const t = state.clock.elapsedTime;
    const d = pathDataRef.current;

    // Mettre à jour l'animation du modèle (battement d'ailes)
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    // Entrée progressive depuis le haut (8 secondes)
    const entryProgress = Math.min(1, elapsed / 8);
    const easedEntry = entryProgress * entryProgress * (3 - 2 * entryProgress);

    // ================================
    // 1. TURBULENCE DE L'AIR (Perlin)
    // ================================
    const nX = noise.noise(t * 0.3, 0, 0);
    const nY = noise.noise(0, t * 0.25, 0);
    const nZ = noise.noise(0, 0, t * 0.3);

    const turbulence = new THREE.Vector3(nX, nY * 0.6, nZ).multiplyScalar(0.35);

    // ================================
    // 2. WANDER BIOLOGIQUE
    // ================================
    const wander = new THREE.Vector3(
      Math.sin(t * 0.7),
      Math.sin(t * 1.3) * 0.4,
      Math.cos(t * 0.6),
    ).multiplyScalar(0.15);

    // ================================
    // 3. DIRECTION CIBLE
    // ================================
    const desiredDir = d.dir.clone().add(turbulence).add(wander).normalize();

    // Steering (inertie réelle)
    d.dir.lerp(desiredDir, 0.04);

    // ================================
    // 4. VITESSE
    // ================================
    const speed = 1.2 + Math.sin(t * 4) * 0.3; // battement d'ailes influence la vitesse
    const targetVel = d.dir.clone().multiplyScalar(speed);

    d.vel.lerp(targetVel, 0.08);

    // ================================
    // 5. POSITION
    // ================================
    d.pos.add(d.vel.clone().multiplyScalar(delta));

    // Limites avec rebond doux (le papillon tourne avant d'atteindre les bords)
    const margin = 4;
    const softMargin = 3;

    // Force de répulsion des bords
    const edgeForce = new THREE.Vector3();
    if (d.pos.x > softMargin) edgeForce.x -= (d.pos.x - softMargin) * 0.3;
    if (d.pos.x < -softMargin) edgeForce.x -= (d.pos.x + softMargin) * 0.3;
    if (d.pos.z > softMargin) edgeForce.z -= (d.pos.z - softMargin) * 0.3;
    if (d.pos.z < -softMargin) edgeForce.z -= (d.pos.z + softMargin) * 0.3;
    // Attirer vers le bas (préférence pour voler dans l'herbe)
    edgeForce.y -= 0.15; // Force constante vers le bas
    if (d.pos.y > 1.5) edgeForce.y -= (d.pos.y - 1.5) * 0.8;
    if (d.pos.y < 0.3) edgeForce.y += (0.3 - d.pos.y) * 0.5;

    d.dir.add(edgeForce.multiplyScalar(delta * 2));
    d.dir.normalize();

    // Limites dures
    d.pos.x = THREE.MathUtils.clamp(d.pos.x, -margin, margin);
    d.pos.z = THREE.MathUtils.clamp(d.pos.z, -margin, margin);
    d.pos.y = THREE.MathUtils.clamp(d.pos.y, 0.4, 2);

    // ================================
    // 6. BATTEMENT D'AILES → PORTANCE
    // ================================
    const lift = Math.sin(t * 12) * 0.06;

    // Appliquer la position avec entrée progressive
    const entryPos = new THREE.Vector3(
      d.pos.x * easedEntry,
      d.pos.y + lift,
      d.pos.z * easedEntry,
    );

    // Position de départ en haut
    entryPos.y = 4 + (d.pos.y + lift - 4) * easedEntry;

    groupRef.current.position.copy(entryPos);

    // ================================
    // 7. ROTATIONS (BIOLOGIQUES)
    // ================================
    const forward = d.vel.clone().normalize();
    const targetYaw = Math.atan2(forward.x, forward.z);

    // Virage → inclinaison (bank)
    let yawDiff = targetYaw - d.rotY;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

    const bank = THREE.MathUtils.clamp(yawDiff * 1.5, -0.6, 0.6);

    // Tangage basé sur la vitesse verticale + oscillation
    const targetPitch = -d.vel.y * 0.3 + Math.sin(t * 6) * 0.04;

    // Interpolation fluide des rotations
    d.rotY = THREE.MathUtils.lerp(d.rotY, targetYaw, 0.08);
    d.rotZ = THREE.MathUtils.lerp(d.rotZ, -bank, 0.1);
    d.rotX = THREE.MathUtils.lerp(d.rotX, targetPitch, 0.08);

    groupRef.current.rotation.set(d.rotX, d.rotY, d.rotZ);
  });

  // Texture de glow circulaire bleu
  const glowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(234, 121, 0, 0.6)");
    gradient.addColorStop(0.3, "rgba(234, 121, 0, 0.3)");
    gradient.addColorStop(0.6, "rgba(200, 100, 0, 0.1)");
    gradient.addColorStop(1, "rgba(150, 70, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  if (!enabled) return null;

  return (
    <group ref={groupRef} scale={0.2} position={[0, 4, 0]}>
      <primitive object={butterflyModel} rotation={[-0.4, 0, 0]} />
      {/* Glow effect - lumière au-dessus du papillon */}
      <pointLight
        color="#ea7900"
        intensity={6}
        distance={6}
        decay={2}
        position={[0, 5, 0]}
      />
      {/* Halo visuel circulaire */}
      <sprite scale={[6, 6, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

// Composant pour l'herbe qui pousse avec InstancedMesh
// Type pour les données des fleurs
interface FlowerData {
  x: number;
  z: number;
  growthDelay: number;
  scale: number;
  rotation: number;
}

function GrowingGrass({
  enabled = true,
  opacity = 1,
}: {
  enabled?: boolean;
  opacity?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const grassCount = 15000;
  const flowerCount = 30;
  const startTimeRef = useRef<number | null>(null);

  // Contrôles leva pour la position du glow (partagé avec Flowers)
  const { glowX, glowY, glowZ, glowIntensity, glowDistance } = useControls(
    "Flower Glow",
    {
      glowX: { value: -0.6, min: -3, max: 3, step: 0.1 },
      glowY: { value: 2.1, min: 0, max: 5, step: 0.1 },
      glowZ: { value: -0.3, min: -3, max: 3, step: 0.1 },
      glowIntensity: { value: 0.02, min: 0, max: 1, step: 0.01 },
      glowDistance: { value: 9.0, min: 0.5, max: 15, step: 0.5 },
    },
  );

  // Données des fleurs - générées une seule fois et partagées
  const flowerData = useMemo<FlowerData[]>(() => {
    const data: FlowerData[] = [];
    for (let i = 0; i < flowerCount; i++) {
      data.push({
        x: -4 + Math.random() * 8,
        z: -4 + Math.random() * 8,
        growthDelay: Math.random() * 20 + 15,
        scale: 0.15 + Math.random() * 0.1,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, [flowerCount]);

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

    // Mettre à jour les positions des lumières des fleurs
    const lightPositions = material.uniforms.uFlowerLightPositions
      .value as THREE.Vector3[];
    const lightIntensities = material.uniforms.uFlowerLightIntensities
      .value as number[];

    for (let i = 0; i < flowerData.length; i++) {
      const data = flowerData[i];

      // Calculer le growthProgress de cette fleur (même calcul que dans Flowers)
      const growthProgress = Math.max(
        0,
        Math.min(1, (elapsed - data.growthDelay) / 5),
      );
      const smoothGrowth =
        growthProgress * growthProgress * (3 - 2 * growthProgress);

      // Position absolue de la lumière (même que la pointLight)
      const worldX = data.x;
      const worldY = 2.2; // Au-dessus de l'herbe
      const worldZ = data.z;

      // Position toujours définie, seule l'intensité change
      lightPositions[i].set(worldX, worldY, worldZ);

      // L'intensité monte de 0 à 1 entre 20% et 50% de croissance
      const startThreshold = 0.2;
      const endThreshold = 0.5;
      const adjustedIntensity =
        smoothGrowth < startThreshold
          ? 0
          : smoothGrowth > endThreshold
            ? 1
            : (smoothGrowth - startThreshold) / (endThreshold - startThreshold);
      lightIntensities[i] = adjustedIntensity;
    }

    // Mettre à jour les paramètres des lumières
    // Toujours passer le nombre total de fleurs, le shader filtrera via l'intensité
    material.uniforms.uFlowerLightCount.value = flowerData.length;
    material.uniforms.uFlowerLightBaseIntensity.value = 2.4;
    material.uniforms.uFlowerLightDistance.value = 2.5;
  });

  if (!enabled) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[grassGeometry, grassMaterial, grassCount]}
        frustumCulled={false}
      />
      <Flowers
        enabled={enabled}
        startTimeRef={startTimeRef}
        flowerData={flowerData}
        glowX={glowX}
        glowY={glowY}
        glowZ={glowZ}
        glowIntensity={glowIntensity}
        glowDistance={glowDistance}
      />
    </>
  );
}

// Précharger le modèle de fleurs
useGLTF.preload("/flowers.glb");

// Composant pour les fleurs dans l'herbe
function Flowers({
  enabled = true,
  startTimeRef,
  flowerData,
  glowX,
  glowY,
  glowZ,
  glowIntensity,
  glowDistance,
}: {
  enabled?: boolean;
  startTimeRef: React.MutableRefObject<number | null>;
  flowerData: FlowerData[];
  glowX: number;
  glowY: number;
  glowZ: number;
  glowIntensity: number;
  glowDistance: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/flowers.glb");

  // Cloner la scène pour chaque fleur
  const flowerClones = useMemo(() => {
    return flowerData.map(() => scene.clone(true));
  }, [scene, flowerData]);

  // Refs pour chaque fleur et leurs pointLights
  const flowerRefs = useRef<THREE.Group[]>([]);
  const lightRefs = useRef<THREE.PointLight[]>([]);

  // Animation de croissance + intensité des lumières
  useFrame((state) => {
    if (!enabled || startTimeRef.current === null) return;

    const elapsed = state.clock.elapsedTime - startTimeRef.current;

    // Itérer sur flowerData (pas sur les refs) pour garantir tous les indices
    for (let i = 0; i < flowerData.length; i++) {
      const data = flowerData[i];
      const ref = flowerRefs.current[i];
      const light = lightRefs.current[i];

      const growthProgress = Math.max(
        0,
        Math.min(1, (elapsed - data.growthDelay) / 5),
      );

      const smoothGrowth =
        growthProgress * growthProgress * (3 - 2 * growthProgress);

      // Mettre à jour le scale de la fleur
      if (ref) {
        ref.scale.setScalar(data.scale * smoothGrowth);
      }

      // Mettre à jour l'intensité de la pointLight (de 0 à 2 entre 20% et 50%)
      if (light) {
        const startThreshold = 0.2;
        const endThreshold = 0.5;
        const lightIntensity =
          smoothGrowth < startThreshold
            ? 0
            : smoothGrowth > endThreshold
              ? 2
              : ((smoothGrowth - startThreshold) /
                  (endThreshold - startThreshold)) *
                2;
        light.intensity = lightIntensity;
      }
    }
  });

  // Texture de glow circulaire rouge (comme le papillon mais en rouge)
  const glowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 100, 80, 0.6)");
    gradient.addColorStop(0.3, "rgba(255, 60, 40, 0.3)");
    gradient.addColorStop(0.6, "rgba(200, 30, 20, 0.1)");
    gradient.addColorStop(1, "rgba(150, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group ref={groupRef}>
      {flowerData.map((data, i) => (
        <group key={i}>
          {/* Groupe scalé pour la fleur */}
          <group
            ref={(el) => {
              if (el) flowerRefs.current[i] = el;
            }}
            position={[data.x, 0, data.z]}
            rotation={[0, data.rotation, 0]}
            scale={0.001}
          >
            <primitive object={flowerClones[i]} />
          </group>
          {/* PointLight en dehors du groupe scalé - position haute pour ne pas éclairer la fleur */}
          <pointLight
            ref={(el) => {
              if (el) lightRefs.current[i] = el;
            }}
            color="#eac301"
            intensity={0}
            distance={3}
            decay={2}
            position={[data.x, 1.5, data.z]}
          />
        </group>
      ))}
    </group>
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

  // Utiliser le composant Butterfly pour l'effet butterfly
  if (effect === "butterfly") {
    return <Butterfly enabled={enabled} />;
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
