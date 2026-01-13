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

// Fragment Shader pour les particules avec glow
export const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    // Glow effect avec centre brillant
    float core = 1.0 - smoothstep(0.0, 0.2, dist);
    float glow = 1.0 - smoothstep(0.1, 0.5, dist);

    vec3 finalColor = mix(vColor, vec3(1.0), core * 0.6);
    float alpha = glow * vAlpha;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;
