import * as THREE from 'three';

/**
 * Addressables Asset Manager for 100,000 Snake Skin Shop
 * Emulates Unity Addressables / AssetBundle asynchronous dynamic loading & disposal.
 * Prevents WebGL memory leaks by strictly enforcing that only visible items keep active
 * GPU buffers and memory allocations.
 */

export interface AddressablesMemoryStats {
  activeGeometries: number;
  activeMaterials: number;
  activeTextures: number;
  recycledSlots: number;
  totalDisposals: number;
}

class AddressableAssetManager {
  private activeGeometries = new Set<THREE.BufferGeometry>();
  private activeMaterials = new Set<THREE.Material>();
  private activeTextures = new Set<THREE.Texture>();
  private totalDisposals = 0;
  private recycledSlots = 0;

  /**
   * Track an instantiated Three.js resource in the active Addressables registry
   */
  public registerGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
    this.activeGeometries.add(geo);
    return geo;
  }

  public registerMaterial<T extends THREE.Material>(mat: T): T {
    this.activeMaterials.add(mat);
    return mat;
  }

  public registerTexture(tex: THREE.Texture): THREE.Texture {
    this.activeTextures.add(tex);
    return tex;
  }

  /**
   * Increment recycled card slot usage counter
   */
  public recordCardRecycle() {
    this.recycledSlots += 1;
  }

  /**
   * Addressables.Release / Unload:
   * Recursively traverses an Object3D hierarchy and strictly disposes of all
   * geometries, materials, and textures from GPU memory.
   */
  public unloadAssetGroup(root: THREE.Object3D | null | undefined): void {
    if (!root) return;

    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;

        if (mesh.geometry) {
          this.activeGeometries.delete(mesh.geometry);
          mesh.geometry.dispose();
          this.totalDisposals += 1;
        }

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(mesh.material);
          }
        }
      }
    });

    // Clear child associations
    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
    }
  }

  private disposeMaterial(mat: THREE.Material) {
    this.activeMaterials.delete(mat);

    // Dispose any textures attached to material properties
    const standardMat = mat as THREE.MeshStandardMaterial;
    if (standardMat.map) {
      this.activeTextures.delete(standardMat.map);
      standardMat.map.dispose();
      this.totalDisposals += 1;
    }
    if (standardMat.emissiveMap) {
      this.activeTextures.delete(standardMat.emissiveMap);
      standardMat.emissiveMap.dispose();
      this.totalDisposals += 1;
    }

    mat.dispose();
    this.totalDisposals += 1;
  }

  /**
   * Get active memory and Addressables status for telemetry / UI badge
   */
  public getMemoryStats(): AddressablesMemoryStats {
    return {
      activeGeometries: this.activeGeometries.size,
      activeMaterials: this.activeMaterials.size,
      activeTextures: this.activeTextures.size,
      recycledSlots: this.recycledSlots,
      totalDisposals: this.totalDisposals,
    };
  }

  /**
   * Reset stats (e.g., when shop closes)
   */
  public resetStats() {
    this.recycledSlots = 0;
  }
}

export const addressableManager = new AddressableAssetManager();
