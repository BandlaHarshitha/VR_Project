import * as THREE from './threejs/build/three.module.js';

export class AppleCollector {
  constructor(scene, dog, getGroundHeightAt, forest, dogStats) {
    this.scene = scene;
    this.dog = dog;
    this.forest = forest;
    this.getGroundHeightAt = getGroundHeightAt;
    this.dogStats = dogStats;

    this.apples = [];
    this.collected = 0;
    this.total = 15;
    this.collectionRadius = 1.0;

    this.ui = this.createUI();
    this.spawnApples();
  }

  createUI() {
    const counter = document.createElement('div');
    counter.style.position = 'absolute';
    counter.style.top = '10px';
    counter.style.right = '10px';
    counter.style.color = 'white';
    counter.style.fontFamily = 'Arial';
    counter.style.fontSize = '16px';
    counter.style.background = 'rgba(0,0,0,0.5)';
    counter.style.padding = '8px 12px';
    counter.style.borderRadius = '5px';
    counter.style.zIndex = 999;
    counter.innerText = `Apples: 0 / ${this.total}`;
    document.body.appendChild(counter);
    return counter;
  }

  spawnApples() {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    // Get forest bounding box
    const box = new THREE.Box3().setFromObject(this.forest);
    const min = box.min;
    const max = box.max;

    let attempts = 0;
    while (this.apples.length < this.total && attempts < 1000) {
      attempts++;
      const x = THREE.MathUtils.lerp(min.x, max.x, Math.random());
      const z = THREE.MathUtils.lerp(min.z, max.z, Math.random());

      const y = this.getGroundHeightAt(x, z) + 0.1;

      // Ensure it's not floating way off (ground check)
      if (y < 0.5 || y > 20) continue;

      const apple = new THREE.Mesh(geometry, material);
      apple.position.set(x, y, z);
      this.apples.push(apple);
      this.scene.add(apple);
    }
  }

  update() {
    if (!this.dog) return;

    const dogPos = this.dog.position;

    this.apples = this.apples.filter(apple => {
      const distance = apple.position.distanceTo(dogPos);
      if (distance < this.collectionRadius) {
        this.scene.remove(apple);
        this.collected++;

        // Increase food and clamp
        this.dogStats.food += 10; // Increase food by 10 per apple collected
        if (this.dogStats.food > this.dogStats.maxFood) {
          this.dogStats.food = this.dogStats.maxFood;
        }

        this.updateUI();
        return false;
      }
      return true;
    });
  }

  updateUI() {
    this.ui.innerText = `Apples: ${this.collected} / ${this.total}`;
  }
}
