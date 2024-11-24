import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";

const modelCache: { [key: string]: THREE.Object3D | null } = {};

/**
 * Preloads a 3D model using GLTFLoader and caches it for future use.
 * @param url The URL of the 3D model to preload.
 * @returns A promise that resolves with the loaded Object3D.
 */
export const preloadModel = (url: string): Promise<THREE.Object3D> => {
  if (modelCache[url]) {
    return Promise.resolve(modelCache[url]!);
  }

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        modelCache[url] = gltf.scene;
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
};
