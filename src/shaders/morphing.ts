// Vertex Shader pour la simulation GPGPU (quad plein écran)
export const simulationVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader pour la simulation - interpole entre 3 formes avec déplacement sur écran U
export const simulationFragmentShader = `
  uniform sampler2D uTextureA;  // Positions forme 1 (écran droite)
  uniform sampler2D uTextureB;  // Positions forme 2 (écran fond)
  uniform sampler2D uTextureC;  // Positions forme 3 (écran gauche)
  uniform float uMorphT;        // 0-1 progression du morphing
  uniform float uFormIndex;     // 0, 1 ou 2 - forme actuelle
  uniform float uScreenOffset;  // Décalage X pour positionner sur l'écran (-1 = gauche, 0 = centre, 1 = droite)
  uniform float uTime;

  varying vec2 vUv;

  // Fonction d'interpolation avec easing
  vec3 smoothMix(vec3 a, vec3 b, float t) {
    float ease = t * t * (3.0 - 2.0 * t); // smoothstep
    return mix(a, b, ease);
  }

  void main() {
    vec3 posA = texture2D(uTextureA, vUv).xyz;
    vec3 posB = texture2D(uTextureB, vUv).xyz;
    vec3 posC = texture2D(uTextureC, vUv).xyz;

    vec3 pos;

    // Sélectionner les formes source et destination selon l'index
    if (uFormIndex < 0.5) {
      // Forme A -> B
      pos = smoothMix(posA, posB, uMorphT);
    } else if (uFormIndex < 1.5) {
      // Forme B -> C
      pos = smoothMix(posB, posC, uMorphT);
    } else {
      // Forme C -> A
      pos = smoothMix(posC, posA, uMorphT);
    }

    // Appliquer le décalage horizontal pour le déplacement entre écrans
    // viewWidth = 3000, donc chaque section = 1000 unités
    pos.x += uScreenOffset * 1000.0;

    gl_FragColor = vec4(pos, 1.0);
  }
`;

// Vertex Shader pour le rendu des particules
export const morphingVertexShader = `
  uniform sampler2D uPositions;   // Texture FBO avec positions calculées
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uResolution;
  uniform float uProgress;

  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute vec2 aReference;      // UV pour sampler la texture de positions

  varying vec3 vColor;
  varying float vAlpha;
  varying vec3 vPos;

  void main() {
    // Lire la position depuis la texture FBO
    vec3 pos = texture2D(uPositions, aReference).xyz;

    vColor = aColor;
    vAlpha = aAlpha;
    vPos = pos;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    // Taille avec perspective
    float sizeScale = uSize * uResolution.y * 0.001;
    gl_PointSize = aSize * sizeScale * uPixelRatio;
    gl_PointSize *= (1.0 / -viewPosition.z);
  }
`;

// Fragment Shader pour la simulation 3D - interpole entre 3 formes avec positions monde
export const simulationFragmentShader3D = `
  uniform sampler2D uTextureA;  // Positions forme 1
  uniform sampler2D uTextureB;  // Positions forme 2
  uniform sampler2D uTextureC;  // Positions forme 3
  uniform float uMorphT;        // 0-1 progression du morphing
  uniform float uFormIndex;     // 0, 1 ou 2 - forme actuelle
  uniform vec3 uPosition1;      // Position monde modèle 1 (droite)
  uniform vec3 uPosition2;      // Position monde modèle 2 (fond)
  uniform vec3 uPosition3;      // Position monde modèle 3 (gauche)
  uniform float uTime;

  varying vec2 vUv;

  // Fonction d'interpolation avec easing
  vec3 smoothMix(vec3 a, vec3 b, float t) {
    float ease = t * t * (3.0 - 2.0 * t); // smoothstep
    return mix(a, b, ease);
  }

  void main() {
    vec3 posA = texture2D(uTextureA, vUv).xyz;
    vec3 posB = texture2D(uTextureB, vUv).xyz;
    vec3 posC = texture2D(uTextureC, vUv).xyz;

    vec3 localPos;
    vec3 worldOffset;

    // Sélectionner les formes source et destination selon l'index
    if (uFormIndex < 0.5) {
      // Forme A -> B
      localPos = smoothMix(posA, posB, uMorphT);
      worldOffset = smoothMix(uPosition1, uPosition2, uMorphT);
    } else if (uFormIndex < 1.5) {
      // Forme B -> C
      localPos = smoothMix(posB, posC, uMorphT);
      worldOffset = smoothMix(uPosition2, uPosition3, uMorphT);
    } else {
      // Forme C -> A
      localPos = smoothMix(posC, posA, uMorphT);
      worldOffset = smoothMix(uPosition3, uPosition1, uMorphT);
    }

    // Position finale = position locale du modèle (scaled) + position monde
    vec3 finalPos = localPos * 0.04 + worldOffset;

    gl_FragColor = vec4(finalPos, 1.0);
  }
`;

// Vertex Shader pour le rendu 3D des particules (dans l'espace monde)
export const morphingVertexShader3D = `
  uniform sampler2D uPositions;   // Texture FBO avec positions calculées
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute vec2 aReference;      // UV pour sampler la texture de positions

  varying vec3 vColor;
  varying float vAlpha;
  varying vec3 vPos;

  void main() {
    // Lire la position depuis la texture FBO
    vec3 pos = texture2D(uPositions, aReference).xyz;

    vColor = aColor;
    vAlpha = aAlpha;
    vPos = pos;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    // Taille avec perspective - plus grande pour la vue 3D
    gl_PointSize = aSize * uSize * uPixelRatio * 100.0;
    gl_PointSize *= (1.0 / -viewPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
  }
`;

// Fragment Shader pour le rendu des particules (forme feuille + glow)
export const morphingFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying vec3 vPos;

  uniform float uTime;
  uniform float uProgress;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    // Forme de feuille
    float y = uv.y + 0.5;
    float leafWidth = sin(y * 3.14159) * 0.5;
    float xDist = abs(uv.x) / max(leafWidth, 0.01);
    float shape = xDist + pow(abs(y - 0.5) * 2.0, 1.5) * 0.3;

    if (shape > 1.0) discard;

    // Glow effect
    float core = 1.0 - smoothstep(0.0, 0.3, shape);
    float glow = 1.0 - smoothstep(0.2, 1.0, shape);

    // Couleur avec variation selon la phase de morphing
    vec3 color = vColor;
    float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + length(vPos) * 0.5);
    color = mix(color, vec3(1.0), core * 0.5 * pulse);

    float alpha = glow * vAlpha;

    gl_FragColor = vec4(color, alpha);
  }
`;
