import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls;
let solidMesh, waterMesh;
let dummy = new THREE.Object3D();
let colorHelper = new THREE.Color();

const GRID_SIZE = 60; 
const GAP = 1.0; 
const MAX_HEIGHT = 15;

// Simulation Data
let mapData = []; // Stores { type, targetHeight, x, z }
let currentHeights = [];
let waterStates = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Reverted fog to previous atmospheric levels
    // Starts closer (40) and fades out sooner (95) for that depth/haze effect
    scene.fog = new THREE.Fog(0x87CEEB, 50, 95);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Keeping the closer camera view as established in previous turn
    camera.position.set(35, 35, 35);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; 

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(50, 80, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -70;
    sunLight.shadow.camera.right = 70;
    sunLight.shadow.camera.top = 70;
    sunLight.shadow.camera.bottom = -70;
    scene.add(sunLight);

    // --- Generation Logic ---
    generateMapData();

    // --- Materials & Geometry ---
    
    // 1. Solid Blocks (Land, Buildings)
    const geometry = new THREE.BoxGeometry(0.95, 1, 0.95);
    geometry.translate(0, 0.5, 0); // Pivot at bottom

    const solidMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true,
    });

    // 2. Water Blocks
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x22aaff,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        flatShading: true
    });

    // Count instances
    const solidCount = mapData.filter(d => d.type !== 'water').length;
    const waterCount = mapData.filter(d => d.type === 'water').length;

    solidMesh = new THREE.InstancedMesh(geometry, solidMaterial, solidCount);
    solidMesh.castShadow = true;
    solidMesh.receiveShadow = true;
    
    waterMesh = new THREE.InstancedMesh(geometry, waterMaterial, waterCount);
    waterMesh.receiveShadow = true;

    // --- Initialize Instance Data ---
    let solidIdx = 0;
    let waterIdx = 0;

    mapData.forEach((data, i) => {
        const { x, z, type, targetHeight } = data;
        
        // Initialize position
        dummy.position.set(x * GAP, 0, z * GAP);
        dummy.scale.set(1, 0.01, 1); // Start flat
        dummy.updateMatrix();

        if (type === 'water') {
            data.instanceId = waterIdx;
            waterMesh.setMatrixAt(waterIdx, dummy.matrix);
            waterStates.push(0); // Current water height
            waterIdx++;
        } else {
            data.instanceId = solidIdx;
            solidMesh.setMatrixAt(solidIdx, dummy.matrix);
            
            // Set Color based on Biome
            let hex;
            if (type === 'sand') hex = 0xe6d8ad;
            else if (type === 'grass') hex = 0x61a357;
            else if (type === 'tree') hex = 0x2d6e32;
            else if (type === 'stone') hex = 0x808080;
            else if (type === 'building_low') hex = 0xcc8866; // Brick
            else if (type === 'building_high') hex = 0xddeeff; // Glass/Steel
            else hex = 0xff00ff; // Error pink

            colorHelper.setHex(hex);
            // Slight color variation for organic feel
            colorHelper.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
            solidMesh.setColorAt(solidIdx, colorHelper);

            currentHeights.push(0); // Start at 0
            solidIdx++;
        }
    });

    scene.add(solidMesh);
    scene.add(waterMesh);

    window.addEventListener('resize', onWindowResize);
}

// --- Simple Noise Functions ---
function noise(x, z) {
    let y = Math.sin(x * 0.1) * Math.cos(z * 0.1);
    y += Math.sin(x * 0.3 + z * 0.2) * 0.5;
    y += Math.sin(x * 0.5 - z * 0.4) * 0.25;
    return y; 
}

function generateMapData() {
    const center = GRID_SIZE / 2;
    const noiseOffset = Math.random() * 100;

    for (let x = -center; x < center; x++) {
        for (let z = -center; z < center; z++) {
            
            // 1. Base Terrain Noise
            let n = noise(x + noiseOffset, z + noiseOffset);
            
            // 2. Shaping (River generation)
            let riverVal = Math.abs(Math.sin((x + z) * 0.15 + n)); 
            
            let type = 'grass';
            let h = 1; // Base height

            // Water threshold
            if (n < -0.8 || riverVal < 0.15) {
                type = 'water';
                h = 0.8; // Water level slightly below block top
            } else if (n < -0.5 || riverVal < 0.25) {
                type = 'sand';
                h = 1.2;
            } else if (n > 0.8) {
                // City Zone
                type = Math.random() > 0.7 ? 'building_high' : 'building_low';
                // Height logic: Taller near center of noise peaks
                h = 2 + Math.pow(n, 2) * 4; 
                if (type === 'building_high') h *= 2.5;
                h = Math.floor(h); // Snap to integer for blocky look
            } else {
                // Forest/Plains
                type = Math.random() > 0.9 ? 'tree' : 'grass';
                if (type === 'tree') h = 2 + Math.floor(Math.random() * 2);
                else h = 1;
            }

            mapData.push({
                x: x, 
                z: z, 
                type: type, 
                targetHeight: Math.max(1, h), // Minimum height 1
                dist: Math.sqrt(x*x + z*z) // For animation delay
            });
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    let solidNeedsUpdate = false;
    let waterNeedsUpdate = false;

    // --- Animate Growth ---
    mapData.forEach((data) => {
        const delay = data.dist * 0.08; // Ripple delay

        if (time > delay) {
            if (data.type === 'water') {
                const current = waterStates[data.instanceId];
                const target = data.targetHeight;
                if (current < target) {
                    const next = current + (target - current) * 0.05;
                    waterStates[data.instanceId] = next;
                    
                    dummy.position.set(data.x * GAP, 0, data.z * GAP);
                    dummy.scale.set(1, next, 1);
                    dummy.updateMatrix();
                    waterMesh.setMatrixAt(data.instanceId, dummy.matrix);
                    waterNeedsUpdate = true;
                }
            } else {
                const current = currentHeights[data.instanceId];
                const target = data.targetHeight;
                
                // Smooth elastic growth
                if (Math.abs(target - current) > 0.01) {
                    const next = current + (target - current) * 0.08;
                    currentHeights[data.instanceId] = next;
                    
                    dummy.position.set(data.x * GAP, 0, data.z * GAP);
                    dummy.scale.set(1, next, 1);
                    dummy.updateMatrix();
                    solidMesh.setMatrixAt(data.instanceId, dummy.matrix);
                    solidNeedsUpdate = true;
                }
            }
        }
    });

    if (solidNeedsUpdate) solidMesh.instanceMatrix.needsUpdate = true;
    if (waterNeedsUpdate) waterMesh.instanceMatrix.needsUpdate = true;

    // Subtle water wave effect
    if (waterMesh.count > 0) {
        waterMesh.position.y = Math.sin(time) * 0.05;
    }

    controls.update();
    renderer.render(scene, camera);
}