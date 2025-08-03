import * as THREE from './threejs/build/three.module.js';
import { VRButton } from './threejs/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from './threejs/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './threejs/examples/jsm/loaders/GLTFLoader.js';
import { DogStats, updateDogStats, createStatsUI } from './Activities.js';
import { AppleCollector } from './Collect.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaec6cf);
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0, 2, 8);
const listener = new THREE.AudioListener();
camera.add(listener);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = true;
controls.minDistance = 2;
controls.maxDistance = 10;
controls.target.set(0,1,0);

// Track when user is manually controlling the camera
/*controls.addEventListener('start', () => {
  userControllingCamera = true;
});

controls.addEventListener('end', () => {
  userControllingCamera = false;
});*/

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dLight = new THREE.DirectionalLight(0xffffff, 0.8);
dLight.position.set(5,10,5);
scene.add(dLight);

let cameraVelocity = new THREE.Vector3();
const cameraSpeed = 0.05;


const loader = new GLTFLoader();
let dog, mixer, currentAction;
const dogAnimations = {};
const keysPressed = {};
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0,-1,0);
let forest, appleCollector;
let gameStarted = false, isSleeping = false, gameOver = false;

const HUNGER_THRESHOLD = 30, FOOD_WARNING_THRESHOLD = 30;
let waterObjects = [];
// Splash particle system
const splashParticles = [];
const MAX_PARTICLES = 30;
const SPLASH_LIFETIME = 0.5; // seconds
let splashCooldown = 0; // Prevents excessive splash spawns
//let userControllingCamera = false;

const splashGeometry = new THREE.SphereGeometry(0.05, 16, 16);
const splashMaterial = new THREE.MeshBasicMaterial({ color: 0x3399ff, transparent: true, opacity: 1, depthWrite: false });

function createSplashParticle(position, color = 0x3399ff) {
  const geometry = new THREE.SphereGeometry(0.025, 12, 12); // smaller particle
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.material.depthWrite = false;
  mesh.renderOrder = 999;
  scene.add(mesh);
  const particle = { mesh, life: SPLASH_LIFETIME };
  splashParticles.push(particle);
  return mesh;
}


function updateSplashParticles(delta) {
  for (let i = splashParticles.length - 1; i >= 0; i--) {
    const p = splashParticles[i];
    p.life -= delta;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      splashParticles.splice(i, 1);
    } else {
      p.mesh.material.opacity = (p.life / SPLASH_LIFETIME) * 0.8;
      p.mesh.position.y += delta * 0.1; // optional rise effect
    }
  }
}



// Sound effect flags
let hasPlayedHappySound = false;
let hasPlayedSadSound = false;

// Load audio
const audioLoader = new THREE.AudioLoader();

const happySound = new THREE.PositionalAudio(listener);
const sadSound = new THREE.PositionalAudio(listener);
const barkSound = new THREE.PositionalAudio(listener);
let barkCooldown = 0;

audioLoader.load('sounds/mixkit-happy-puppy-barks-741.wav', buffer => {
  happySound.setBuffer(buffer);
  happySound.setRefDistance(5);
  happySound.setLoop(false);
  happySound.setDirectionalCone(60, 180, 0.1);
  happySound.rotationAutoUpdate = true;
});

audioLoader.load('sounds/mixkit-dog-whimper-sad-466.wav', buffer => {
  sadSound.setBuffer(buffer);
  sadSound.setRefDistance(5);
  sadSound.setLoop(false);
  sadSound.setDirectionalCone(60, 180, 0.1);
  sadSound.rotationAutoUpdate = true;
});

audioLoader.load('sounds/dog-bark-179915.mp3', buffer => {
  barkSound.setBuffer(buffer);
  barkSound.setRefDistance(5);
  barkSound.setLoop(false);
  barkSound.setDirectionalCone(60, 180, 0.1);
  barkSound.rotationAutoUpdate = true;
});



const zzSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(createZZCanvas()), transparent: true
}));
zzSprite.scale.set(1,1,1);
zzSprite.visible = false;
scene.add(zzSprite);

function createZZCanvas(){
  const size=128, c=document.createElement('canvas');
  c.width=c.height=size;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,size,size);
  ctx.font='bold 90px Arial'; ctx.fillStyle='white';
  ctx.strokeStyle='black'; ctx.lineWidth=6;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.strokeText('Z', size/2-20, size/2);
  ctx.strokeText('Z', size/2+20, size/2+30);
  ctx.fillText('Z', size/2-20, size/2);
  ctx.fillText('Z', size/2+20, size/2+30);
  return c;
}

const dogStats = new DogStats();
dogStats.food = 100;
dogStats.maxFood = 100;
createStatsUI(dogStats);

const foodBarContainer = document.createElement('div');
Object.assign(foodBarContainer.style, {
  position:'absolute', top:'80px', right:'10px',
  width:'150px', height:'20px',
  backgroundColor:'#555', border:'2px solid #333',
  borderRadius:'5px', zIndex:'1000'
});
const foodLabel = document.createElement('div');
foodLabel.textContent='Food';
Object.assign(foodLabel.style, {
  position:'absolute', top:'-20px', right:'0',
  color:'white', font:'14px Arial', userSelect:'none'
});
foodBarContainer.appendChild(foodLabel);

const foodBar = document.createElement('div');
Object.assign(foodBar.style, {
  width:'100%', height:'100%',
  backgroundColor:'#4caf50', borderRadius:'3px',
  transition:'width 0.3s ease'
});
foodBarContainer.appendChild(foodBar);
document.body.appendChild(foodBarContainer);

function updateFoodBar(){
  const pct = dogStats.food / dogStats.maxFood * 100;
  foodBar.style.width = pct + '%';
  foodBar.style.backgroundColor =
    pct > 60 ? '#4caf50' :
    pct > 30 ? '#ff9800' : '#f44336';
}

const messageContainer = document.createElement('div');
Object.assign(messageContainer.style, {
  position:'absolute', top:'50%', left:'50%',
  transform:'translate(-50%,-50%)',
  color:'white', font:'bold 48px Arial',
  textShadow:'2px 2px 6px black',
  zIndex:'2000', userSelect:'none',
  pointerEvents:'none'
});
document.body.appendChild(messageContainer);

const restartButton = document.createElement('button');
Object.assign(restartButton.style, {
  position:'absolute', top:'60%', left:'50%',
  transform:'translate(-50%,-50%)', padding:'10px 20px',
  fontSize:'18px', cursor:'pointer', display:'none', zIndex:'2001'
});
restartButton.textContent='Restart';
restartButton.onclick = () => location.reload();
document.body.appendChild(restartButton);

const gameButton = document.createElement('button');
Object.assign(gameButton.style, {
  position:'absolute', top:'10px', right:'10px',
  padding:'10px 20px', fontSize:'16px', cursor:'pointer',
  zIndex:'999'
});
gameButton.textContent='Start Game';
gameButton.onclick = () => {
  gameStarted = true;
  gameButton.remove();
  quitButton.style.display = 'block';
};

document.body.appendChild(gameButton);

const quitButton = document.createElement('button');
Object.assign(quitButton.style, {
  position: 'absolute',
  top: '110px',  // Just below the food bar (food bar is at 80px + height)
  right: '10px',
  padding: '8px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  zIndex: '999',
  display: 'none',
  backgroundColor: '#c62828',
  color: 'white',
  border: 'none',
  borderRadius: '4px'
});
quitButton.textContent = 'Quit Game';
quitButton.onclick = () => {
  gameStarted = false;
  gameOver = true;
  hasPlayedHappySound = false;
  hasPlayedSadSound = false;
  messageContainer.textContent = 'Game Quit';
  restartButton.style.display = 'block';
  quitButton.style.display = 'none';
  foodBarContainer.style.display = 'none'; // Optional: hide food bar after quitting
};
document.body.appendChild(quitButton);

// --- MODEL LOADING ---
loader.load('./models/autumn_landscape.glb', g=>{
  forest = g.scene; forest.scale.set(5,5,5); scene.add(forest);
  waterObjects = findWaterCandidates(forest);

  // Visual debug: color water meshes blue
  waterObjects.forEach(w => {
    if (w.object.material) {
      w.object.material.color.set(0x3399ff);
      w.object.material.opacity = 0.7;
      w.object.material.transparent = true;
    }
  });

  console.log('Water candidates:', waterObjects.map(w=>w.name));
});

loader.load('./models/German Shepard.glb', d=>{
  dog = d.scene; dog.scale.set(0.3,0.3,0.3);
  dog.position.set(1,0,1); dog.rotation.y = Math.PI;
  scene.add(dog);
  dog.add(happySound);
  dog.add(sadSound);
  dog.add(barkSound);

  mixer = new THREE.AnimationMixer(dog);
  d.animations.forEach(c => {
    dogAnimations[c.name.toLowerCase()] = mixer.clipAction(c);
  });
  playAnimation('idle');
  dog.position.y = getGroundHeightAt(dog.position.x, dog.position.z);
});

function playAnimation(name, once = false){
  if (!mixer || !dogAnimations[name]) return;
  if (currentAction === dogAnimations[name]) return;
  if (currentAction) currentAction.fadeOut(0.2);
  currentAction = dogAnimations[name];
  currentAction.reset().fadeIn(0.2).play();
  currentAction.loop = once ? THREE.LoopOnce : THREE.LoopRepeat;
  currentAction.clampWhenFinished = once;
}

function getGroundHeightAt(x,z){
  raycaster.set(new THREE.Vector3(x,10,z), down);
  const hits = raycaster.intersectObject(forest,true);
  return hits.length ? hits[0].point.y : 0;
}

// Returns true if dog is over water mesh
function isDogOverWater() {
  if (!dog || !waterObjects || waterObjects.length === 0 || !forest) return false;
  const origin = dog.position.clone();
  origin.y += 0.5;
  raycaster.set(origin, new THREE.Vector3(0, -1, 0));

  // Raycast against the whole scene (forest contains ground and water)
  const hits = raycaster.intersectObject(forest, true);
  if (!hits.length) return false;

  // Get all water mesh references
  const waterMeshes = waterObjects.map(w => w.object);

  // If the FIRST hit is a water mesh, return true
  return waterMeshes.includes(hits[0].object);
}

function findWaterCandidates(root) {
  const waterCandidates = [];
  root.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const mat = obj.material;
      // Check transparency or opacity
      const isTransparent = mat.transparent === true || (mat.opacity !== undefined && mat.opacity < 1);
      // Check for blueish color (color property exists and blue component is dominant)
      const color = mat.color;
      const isBlueish = color && (color.b > color.r && color.b > color.g);
      // Optionally check material name or map name for "water"
      const nameContainsWater = (mat.name && mat.name.toLowerCase().includes('water')) ||
                                (mat.map && mat.map.name && mat.map.name.toLowerCase().includes('water'));
      if (isTransparent || isBlueish || nameContainsWater) {
        waterCandidates.push({
          name: obj.name || '(no name)',
          object: obj,
          material: mat,
          transparent: isTransparent,
          blueish: isBlueish,
          matName: mat.name || '(no material name)',
          mapName: (mat.map && mat.map.name) || '(no map)'
        });
      }
    }
  });
  return waterCandidates;
}

// --- INPUT HANDLING ---
window.addEventListener('keydown', e => {
  keysPressed[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 's' && !isSleeping && dogAnimations['death']){
    isSleeping = true;
    playAnimation('death', true);
    dogStats.health = 100;
    dogStats.mood = 100;
    dogStats.updateBars();
    zzSprite.visible = true;
    currentAction.getMixer().addEventListener('finished', () => {
      isSleeping = false;
      zzSprite.visible = false;
      playAnimation('idle');
    });
  }
});

window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  keysPressed[k] = false;
  if (!['w','r','e','j'].some(x=>keysPressed[x]) && !isSleeping){
    playAnimation('idle');
    hasPlayedHappySound = false;
    hasPlayedSadSound = false;
  }
});
window.addEventListener('click', (event) => {
  if (!dog) return;
  // Convert mouse click to normalized device coordinates (-1 to +1)
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
  // Check intersection with dog mesh and its children
  const intersects = raycaster.intersectObject(dog, true);
  if (intersects.length > 0) {
    if (!hasPlayedHappySound) {
      if (happySound.isPlaying) happySound.stop();
      happySound.play();
      hasPlayedHappySound = true;
      setTimeout(() => { hasPlayedHappySound = false; }, 2000); // reset flag after 2 seconds so sound can play again
    }
  }
});

const clock = new THREE.Clock();

let wasDogOverWater = false; // For splash-on-move logic

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if ((keysPressed['r'] || keysPressed['j']) && barkCooldown <= 0) {
    if (barkSound.isPlaying) barkSound.stop();
    barkSound.play();
    barkCooldown = 5;
  }
  if (barkCooldown > 0) {
    barkCooldown -= delta;
  }


  mixer?.update(delta);
  if (!dog || !forest) return;

  if (gameOver){
    renderer.render(scene,camera);
    return;
  }

  if (gameStarted && dogStats.mood < 50){
    dogStats.health = Math.max(0, dogStats.health - (50 - dogStats.mood) * 0.08 * delta);
  }

  if (dogStats.health <= 0){
    messageContainer.textContent = 'END!';
    if (!hasPlayedSadSound){
      if (sadSound.isPlaying) sadSound.stop();
      sadSound.play();
      hasPlayedSadSound = true;
    }
    restartButton.style.display = 'block';
    gameOver = true;
    renderer.render(scene,camera);
    return;
  }

  if (dogStats.hunger <= 30){
    messageContainer.textContent = 'EAT to move!You are too hungry!';
    if (!hasPlayedSadSound){
      sadSound.play();
      hasPlayedSadSound = true;
    }
  } else if (dogStats.food < FOOD_WARNING_THRESHOLD) {
    messageContainer.textContent = 'HUNT to fill up on food!';

  }
  else if (dogStats.mood < 0) {
    messageContainer.textContent = 'SLEEP to improve your mood!';
    
  }
  else {
    messageContainer.textContent = '';
  }

  let speed = 0, isMoving = false, isEating = false;

  if (!isSleeping && dogStats.health > 0){
    if (dogStats.food > 0){
      if (keysPressed['w']){
        playAnimation('walk'); speed = 0.015; isMoving = true;
      } else if (keysPressed['r']){
        playAnimation('run'); speed = 0.03; isMoving = true;
      } else if (keysPressed['j']){
        playAnimation('run_jump'); speed = 0.05; isMoving = true;
      }
    }
    if (keysPressed['e'] && dogStats.food > 0){
      playAnimation('eating');
      isEating = true;
      dogStats.food = Math.max(0, dogStats.food - 20 * delta);
    }

    if (keysPressed['n']) dog.rotation.y += 0.04;
    if (keysPressed['m']) dog.rotation.y -= 0.04;

    if (speed > 0){
      const dir = new THREE.Vector3(0,0,1).applyQuaternion(dog.quaternion);
      const next = dog.position.clone().add(dir.multiplyScalar(speed));
      const cy = getGroundHeightAt(dog.position.x, dog.position.z);
      const ny = getGroundHeightAt(next.x, next.z);
      if (ny - cy <= 0.2){
        dog.position.set(next.x, ny, next.z);
      } else {
        playAnimation('idle');
        dogStats.setState('idle');
      }
    }
  }

  if (!isSleeping){
    updateDogStats(dogStats, { isMoving, isEating, delta });
  }
  updateFoodBar();

  if (isSleeping){
    zzSprite.position.copy(dog.position).add(new THREE.Vector3(0,3,0));
  }

  if (gameStarted && !gameOver){
    if (!appleCollector){
      appleCollector = new AppleCollector(scene, dog, getGroundHeightAt, forest, dogStats);
    }
    appleCollector.update();

    /*const dir = new THREE.Vector3(0,0,1).applyQuaternion(dog.quaternion);
    const behind = dog.position.clone().addScaledVector(dir, -4).add(new THREE.Vector3(0,2,0));
    camera.position.lerp(behind, 0.1);
    controls.target.lerp(dog.position.clone().add(new THREE.Vector3(0,1,0)), 0.1);
    controls.update();*/
    /*if (!userControllingCamera) {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(dog.quaternion);
        const behind = dog.position.clone().addScaledVector(dir, -4).add(new THREE.Vector3(0, 2, 0));
        camera.position.lerp(behind, 0.1);
        controls.target.lerp(dog.position.clone().add(new THREE.Vector3(0, 1, 0)), 0.1);
    }
    controls.update();*/
    if (isMoving) {
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(dog.quaternion);
        const behind = dog.position.clone().addScaledVector(dir, -2.5).add(new THREE.Vector3(0, 2, 0));
        camera.position.lerp(behind, 0.1);
        controls.target.lerp(dog.position.clone().add(new THREE.Vector3(0, 1, 0)), 0.1);
    }
    controls.update();

  }

  // --- SPLASH LOGIC ---
  const dogOverWater = isDogOverWater();
  if (dogStats.health > 0 && !isSleeping) {
    if (dogOverWater && isMoving && splashCooldown <= 0) {
      // Create several small splash particles per event
      for (let i = 0; i < 5; i++) {
        const splashPos = dog.position.clone();
        // Scatter splash randomly around the dog (within a radius)
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.15 + Math.random() * 0.15; // 0.15 to 0.3 units from center
        splashPos.x += Math.cos(angle) * radius;
        splashPos.z += Math.sin(angle) * radius;
        splashPos.y += 0.08 + Math.random() * 0.08; // small random height

        // Alternate blue and white particles
        const color = (i % 2 === 0) ? 0x3399ff : 0xffffff;
        createSplashParticle(splashPos, color);
      }
      splashCooldown = 0.15; // 150ms between splashes
    }
  }
  if (splashCooldown > 0) splashCooldown -= delta;

  updateSplashParticles(delta);

  // First-person camera movement with arrow keys
  const moveForward = keysPressed['arrowup'];
  const moveBackward = keysPressed['arrowdown'];
  const moveLeft = keysPressed['arrowleft'];
  const moveRight = keysPressed['arrowright'];

  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();

  const strafeDirection = new THREE.Vector3().crossVectors(camera.up, cameraDirection).normalize();

  if (moveForward) cameraVelocity.add(cameraDirection.clone().multiplyScalar(cameraSpeed));
  if (moveBackward) cameraVelocity.add(cameraDirection.clone().multiplyScalar(-cameraSpeed));
  if (moveLeft) cameraVelocity.add(strafeDirection.clone().multiplyScalar(cameraSpeed));
  if (moveRight) cameraVelocity.add(strafeDirection.clone().multiplyScalar(-cameraSpeed));

  // Apply velocity to camera position
  camera.position.add(cameraVelocity);

  // Slowly decay velocity (for smoother stops)
  cameraVelocity.multiplyScalar(0.8);



  renderer.render(scene, camera);
});

