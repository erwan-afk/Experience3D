import * as THREE from "three";

interface FBOOptions {
  width: number;
  height: number;
  renderer: THREE.WebGLRenderer;
  simulationMaterial: THREE.ShaderMaterial;
}

/**
 * Frame Buffer Object pour le rendu GPGPU
 * Permet de calculer les positions des particules sur le GPU
 */
export class FBO {
  private width: number;
  private height: number;
  private renderer: THREE.WebGLRenderer;
  private simulationMaterial: THREE.ShaderMaterial;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh;
  private renderTarget: THREE.WebGLRenderTarget;

  constructor(options: FBOOptions) {
    this.width = options.width;
    this.height = options.height;
    this.renderer = options.renderer;
    this.simulationMaterial = options.simulationMaterial;

    // Scène pour le rendu offscreen
    this.scene = new THREE.Scene();

    // Caméra orthographique pour couvrir tout le quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Quad plein écran
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.simulationMaterial);
    this.scene.add(this.mesh);

    // Un seul render target (pas de ping-pong nécessaire pour l'interpolation)
    const rtOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.renderTarget = new THREE.WebGLRenderTarget(
      this.width,
      this.height,
      rtOptions,
    );
  }

  /**
   * Retourne la texture contenant les positions calculées
   */
  get texture(): THREE.Texture {
    return this.renderTarget.texture;
  }

  /**
   * Met à jour la simulation
   */
  update(): void {
    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(oldTarget);
  }

  /**
   * Libère les ressources
   */
  dispose(): void {
    this.renderTarget.dispose();
    this.mesh.geometry.dispose();
  }
}

/**
 * Crée une DataTexture à partir des positions d'un modèle 3D
 */
export function createPositionTexture(
  positions: Float32Array,
  textureSize: number,
): THREE.DataTexture {
  const count = textureSize * textureSize;
  const data = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const i4 = i * 4;

    if (i3 < positions.length) {
      data[i4] = positions[i3]; // X
      data[i4 + 1] = positions[i3 + 1]; // Y
      data[i4 + 2] = positions[i3 + 2]; // Z
      data[i4 + 3] = 1.0; // W
    } else {
      // Réutiliser des positions aléatoires si pas assez de vertices
      const randomIndex =
        Math.floor(Math.random() * (positions.length / 3)) * 3;
      data[i4] = positions[randomIndex];
      data[i4 + 1] = positions[randomIndex + 1];
      data[i4 + 2] = positions[randomIndex + 2];
      data[i4 + 3] = 1.0;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    textureSize,
    textureSize,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.needsUpdate = true;

  return texture;
}

/**
 * Extrait les positions des vertices d'une géométrie Three.js
 */
export function extractPositions(geometry: THREE.BufferGeometry): Float32Array {
  const positionAttribute = geometry.getAttribute("position");
  return new Float32Array(positionAttribute.array);
}

/**
 * Calcule la taille de texture optimale pour un nombre de particules
 */
export function getOptimalTextureSize(particleCount: number): number {
  return Math.ceil(Math.sqrt(particleCount));
}

/**
 * Crée une DataTexture à partir des couleurs RGBA
 */
export function createColorTexture(
  colors: Float32Array,
  textureSize: number,
): THREE.DataTexture {
  const count = textureSize * textureSize;
  const data = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const i4 = i * 4;

    if (i4 < colors.length) {
      data[i4] = colors[i4]; // R
      data[i4 + 1] = colors[i4 + 1]; // G
      data[i4 + 2] = colors[i4 + 2]; // B
      data[i4 + 3] = colors[i4 + 3]; // A
    } else {
      // Couleur par défaut (blanc)
      data[i4] = 1.0;
      data[i4 + 1] = 1.0;
      data[i4 + 2] = 1.0;
      data[i4 + 3] = 1.0;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    textureSize,
    textureSize,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.needsUpdate = true;

  return texture;
}
