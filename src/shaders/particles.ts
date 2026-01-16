// Vertex Shader simple - les positions sont calculées sur le CPU
export const particleVertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize;
  }
`;

// Fragment Shader pour les particules en forme de feuille avec glow
export const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    // Forme de feuille : plus large au milieu, pointue aux extrémités
    float y = uv.y + 0.5; // 0 en bas, 1 en haut

    // Largeur de la feuille : max au centre, 0 aux extrémités
    float leafWidth = sin(y * 3.14159) * 0.5;

    // Distance horizontale normalisée par la largeur
    float xDist = abs(uv.x) / max(leafWidth, 0.01);

    // Forme de feuille
    float shape = xDist + pow(abs(y - 0.5) * 2.0, 1.5) * 0.3;

    if (shape > 1.0) discard;

    // Glow effect avec centre brillant
    float core = 1.0 - smoothstep(0.0, 0.3, shape);
    float glow = 1.0 - smoothstep(0.2, 1.0, shape);

    vec3 finalColor = mix(vColor, vec3(1.0), core * 0.5);
    float alpha = glow * vAlpha;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;
