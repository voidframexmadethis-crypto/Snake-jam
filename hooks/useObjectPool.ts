'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface PooledObject {
  mesh: THREE.Mesh;
  active: boolean;
}

export function useLowPolyObjectPool(scene: THREE.Scene | null, poolSize: number = 200) {
  const poolRef = useRef<PooledObject[]>([]);

  useEffect(() => {
    if (!scene) return;

    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.4,
      metalness: 0.2,
    });

    const pool: PooledObject[] = [];
    for (let i = 0; i < poolSize; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      pool.push({ mesh, active: false });
    }
    poolRef.current = pool;

    return () => {
      pool.forEach((item) => {
        scene.remove(item.mesh);
        item.mesh.geometry.dispose();
      });
      poolRef.current = [];
    };
  }, [scene, poolSize]);

  const acquire = (x: number, y: number, z: number, color?: string): THREE.Mesh | null => {
    const item = poolRef.current.find((p) => !p.active);
    if (item) {
      item.active = true;
      item.mesh.visible = true;
      item.mesh.position.set(x, y, z);
      if (color && item.mesh.material instanceof THREE.MeshStandardMaterial) {
        item.mesh.material.color.set(color);
      }
      return item.mesh;
    }
    return null;
  };

  const release = (mesh: THREE.Mesh) => {
    const item = poolRef.current.find((p) => p.mesh === mesh);
    if (item) {
      item.active = false;
      item.mesh.visible = false;
    }
  };

  return { acquire, release };
}
