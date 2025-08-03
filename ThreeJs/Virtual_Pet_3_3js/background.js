// background.js
import { GLTFLoader } from './threejs/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from './threejs/build/three.module.js';

export function loadBackground(scene) {
  const loader = new GLTFLoader();

  // 🌱 Add a green grassy ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x3c9f40 }) // grassy green
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // 🌿 Bushes closer to the dog (dog is at [0, 0, -2])
  const bushPositions = [
    [0.5, 0, -2.2],
    [-0.8, 0, -1.9],
    [1.0, 0, -1.5],
    [-1.2, 0, -2.5],
    [0.3, 0, -3.0]
  ];

  const bushPromises = bushPositions.map((pos) => {
    return new Promise((resolve, reject) => {
      loader.load(
        './models/Ultimate Stylized Nature Pack-glb/Bushes.glb',
        (gltf) => {
          const bush = gltf.scene;
          bush.position.set(...pos);
          bush.scale.setScalar(0.9);
          bush.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(bush);
          resolve(bush);
        },
        undefined,
        reject
      );
    });
  });

  return Promise.all(bushPromises);
}
