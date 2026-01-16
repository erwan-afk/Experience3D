// ============================================
// Shaders pour le système de réflexion custom
// Blur 2-pass + composition avec depth fade
// ============================================

// Vertex shader simple pour les passes de blur (quad plein écran)
export const blurVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader - Gaussian blur horizontal 13-tap
export const blurHorizontalShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uStrength;

  varying vec2 vUv;

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec4 color = vec4(0.0);

    // Poids gaussiens précalculés (sigma ~2.5)
    float weights[7];
    weights[0] = 0.199471;
    weights[1] = 0.176033;
    weights[2] = 0.120985;
    weights[3] = 0.064759;
    weights[4] = 0.026995;
    weights[5] = 0.008764;
    weights[6] = 0.002216;

    // Sample central
    color += texture2D(uTexture, vUv) * weights[0];

    // Samples symétriques
    for (int i = 1; i < 7; i++) {
      float offset = float(i) * uStrength * texelSize.x;
      color += texture2D(uTexture, vUv + vec2(offset, 0.0)) * weights[i];
      color += texture2D(uTexture, vUv - vec2(offset, 0.0)) * weights[i];
    }

    gl_FragColor = color;
  }
`;

// Fragment shader - Gaussian blur vertical 13-tap
export const blurVerticalShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uStrength;

  varying vec2 vUv;

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec4 color = vec4(0.0);

    // Poids gaussiens précalculés (sigma ~2.5)
    float weights[7];
    weights[0] = 0.199471;
    weights[1] = 0.176033;
    weights[2] = 0.120985;
    weights[3] = 0.064759;
    weights[4] = 0.026995;
    weights[5] = 0.008764;
    weights[6] = 0.002216;

    // Sample central
    color += texture2D(uTexture, vUv) * weights[0];

    // Samples symétriques
    for (int i = 1; i < 7; i++) {
      float offset = float(i) * uStrength * texelSize.y;
      color += texture2D(uTexture, vUv + vec2(0.0, offset)) * weights[i];
      color += texture2D(uTexture, vUv - vec2(0.0, offset)) * weights[i];
    }

    gl_FragColor = color;
  }
`;

// Vertex shader pour la composition finale (mesh de réflexion)
export const compositeVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader - Composition finale avec vrai fondu vers noir transparent
export const compositeFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uBrightness;
  uniform float uFadeStart;
  uniform float uFadeEnd;

  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uTexture, vUv);

    // Fade linéaire basé sur la position Y
    float fade = 1.0 - clamp((vUv.y - uFadeStart) / (uFadeEnd - uFadeStart), 0.0, 1.0);

    // Multiplier RGB ET alpha par le fade pour un vrai fondu vers le noir transparent
    vec3 finalColor = color.rgb * uBrightness * fade;
    float finalAlpha = uOpacity * fade;

    // Discard les pixels très transparents
    if (finalAlpha < 0.01) discard;

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;
