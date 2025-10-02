// Three.js Stars - Vanilla JavaScript Version
(function() {
  // Variables to store references
  let scene, camera, renderer, sphere;
  let skybox;
  let pathPoints = [];
  let trailPoints = [];
  let starClusters = [];
  let distanceTraveled = 0;
  let speed = 0.12;
  let targetSpeed = 0.12;
  let isDragging = false;
  let previousMouse = { x: 0, y: 0 };
  let cameraAngle = { theta: -Math.PI / 2, phi: Math.PI / 4 };
  let cameraDistance = 18;
  let renderDistance = 100;
  let physicsMode = 'standard'; // 'standard' or 'chain'
  let modeDisplay = 'standard';
  
  // Performance optimization variables
  let activeClusters = []; // Only 8-10 clusters active at once (increased for higher density)
  let maxActiveClusters = 10;
  let currentClusterIndex = 0; // Index of cluster sphere is currently interacting with
  let clusterPool = []; // Pool of pre-created cluster data
  let frameCount = 0;
  
  // Particle tail system - red and orange particle tail
  let tailParticles = [];
  let maxTailParticles = 200; // Increased for wider tail
  let tailParticleGeometry = new THREE.SphereGeometry(0.08, 8, 8); // Larger particles for wider tail
  let tailColors = [0xff0000, 0xff4400]; // Red and orange colors
  
  // Additional performance optimizations
  let totalPathLength = 0; // Cache path length calculation
  let pathLengthCalculated = false;
  let geometryPool = []; // Pool of geometries
  let materialPool = []; // Pool of materials
  let trailUpdateCounter = 0; // Throttle trail updates
  
  // LOD (Level of Detail) system
  let lodDistances = [25, 50, 100]; // Distance thresholds for LOD (increased for better visibility)
  let lodMultipliers = [1.0, 0.8, 0.5]; // Star count multipliers (less aggressive reduction)
  let lodGeometries = []; // Different geometry qualities
  
  // Frame rate adaptive quality
  let frameRateHistory = [];
  let adaptiveQuality = 1.0; // Quality multiplier
  let lastFrameTime = 0;
  
  // Performance monitoring
  let fpsCounter = 0;
  let fpsHistory = [];
  let lastFpsUpdate = 0;
  let currentFps = 0;
  let averageFps = 0;
  let minFps = Infinity;
  let maxFps = 0;
  let performanceMetrics = {
    totalFrameTime: 0,
    renderTime: 0,
    physicsTime: 0,
    clusterUpdateTime: 0,
    starCount: 0,
    clusterCount: 0,
    drawCalls: 0
  };

  // Camera dampening variables
  let cameraTargetPosition = new THREE.Vector3();
  let cameraCurrentPosition = new THREE.Vector3();
  let cameraDampening = 0.05; // How smoothly camera follows sphere
  let cameraLookAtTarget = new THREE.Vector3();
  let cameraLookAtCurrent = new THREE.Vector3();
  let lookAtDampening = 0.08; // How smoothly camera looks at sphere
  let sphereOffsetX = 0; // Current X offset from original position
  let sphereVelocityX = 0; // X velocity for smooth movement
  let sphereOffsetY = 0; // Current Y offset from original position
  let sphereVelocityY = 0; // Y velocity for smooth movement
  let keysPressed = { a: false, d: false, w: false, s: false }; // Track which keys are pressed
  let originalSphereY = 0; // Store original Y position for wobble effect

  // Function to update particle tail - red and orange particle tail
  function updateTailParticles() {
    // Add new particle at sphere position (every frame for wide tail)
    const particleColor = tailColors[Math.floor(Math.random() * tailColors.length)]; // Random red or orange
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: particleColor,
      transparent: true, 
      opacity: 0.9, // High opacity for visibility
      emissive: particleColor,
      emissiveIntensity: 0.5
    });
    
    const particle = new THREE.Mesh(tailParticleGeometry, particleMaterial);
    particle.position.copy(sphere.position);
    particle.userData = {
      life: 1.0, // Full opacity initially
      maxLife: 1.0,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.08, // Wider random velocity for wider tail
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08
      )
    };
    
    scene.add(particle);
    tailParticles.push(particle);
    
    // Remove oldest particles if we exceed max
    if (tailParticles.length > maxTailParticles) {
      const oldParticle = tailParticles.shift();
      scene.remove(oldParticle);
      oldParticle.material.dispose();
    }
    
    // Update existing particles (red and orange tail)
    tailParticles.forEach((particle, index) => {
      // Reduce life (much slower fade for longer tail)
      particle.userData.life -= 0.008; // Much slower fade for longer tail
      
      // Apply velocity
      particle.position.add(particle.userData.velocity);
      
      // Apply drag
      particle.userData.velocity.multiplyScalar(0.99); // Much less drag for longer tail
      
      // Update opacity based on life (bright colors)
      const opacity = particle.userData.life;
      particle.material.opacity = opacity * 0.9; // High opacity for visibility
      
      // Remove dead particles
      if (particle.userData.life <= 0) {
        scene.remove(particle);
        particle.material.dispose();
        tailParticles.splice(index, 1);
      }
    });
  }

  // Function to update sphere movement based on keyboard input
  function updateSphereMovement() {
    const baseAcceleration = 0.003; // Further reduced base acceleration rate for slower movement
    const verticalAcceleration = 0.0015; // Slower acceleration for vertical movement
    const accelerationMultiplier = 1.03; // Further reduced acceleration multiplier for smoother buildup
    const friction = 0.98; // Increased friction for much smoother stopping
    const maxSpeed = 0.12; // Further reduced maximum movement speed
    const maxVerticalSpeed = 0.06; // Slower maximum speed for vertical movement
    const maxDeviation = 15; // Increased maximum distance from center position
    const pullbackForce = 0.005; // Further reduced pullback force for much gentler return
    const verticalPullbackForce = 0.0025; // Even gentler pullback for vertical movement
    const wobbleStrength = 0.2; // Reduced wobble strength for smoother effect
    
    // Apply input forces with accelerating effect (X-axis)
    if (keysPressed.a) {
      // Increase acceleration over time for smooth start
      const currentAcceleration = baseAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityX) * 20);
      sphereVelocityX += currentAcceleration; // A now moves right (was left)
    }
    if (keysPressed.d) {
      // Increase acceleration over time for smooth start
      const currentAcceleration = baseAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityX) * 20);
      sphereVelocityX -= currentAcceleration; // D now moves left (was right)
    }
    
    // Apply input forces with accelerating effect (Y-axis) - SLOWER
    if (keysPressed.w) {
      // Increase acceleration over time for smooth start - SLOWER
      const currentAcceleration = verticalAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityY) * 20);
      sphereVelocityY += currentAcceleration; // W moves up
    }
    if (keysPressed.s) {
      // Increase acceleration over time for smooth start - SLOWER
      const currentAcceleration = verticalAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityY) * 20);
      sphereVelocityY -= currentAcceleration; // S moves down
    }
    
    // Apply pullback force when no keys are pressed (X-axis)
    if (!keysPressed.a && !keysPressed.d) {
      // Apply friction
      sphereVelocityX *= friction;
      
      // Apply pullback force towards center
      const pullbackDirection = -Math.sign(sphereOffsetX); // Direction towards center
      const pullbackStrength = pullbackForce * Math.abs(sphereOffsetX); // Stronger pull when further from center
      sphereVelocityX += pullbackDirection * pullbackStrength;
    }
    
    // Apply pullback force when no keys are pressed (Y-axis) - SLOWER
    if (!keysPressed.w && !keysPressed.s) {
      // Apply friction
      sphereVelocityY *= friction;
      
      // Apply pullback force towards center - SLOWER
      const pullbackDirection = -Math.sign(sphereOffsetY); // Direction towards center
      const pullbackStrength = verticalPullbackForce * Math.abs(sphereOffsetY); // Gentler pull for vertical
      sphereVelocityY += pullbackDirection * pullbackStrength;
    }
    
    // Limit maximum speed (X-axis)
    sphereVelocityX = Math.max(-maxSpeed, Math.min(maxSpeed, sphereVelocityX));
    
    // Limit maximum speed (Y-axis) - SLOWER
    sphereVelocityY = Math.max(-maxVerticalSpeed, Math.min(maxVerticalSpeed, sphereVelocityY));
    
    // Update offset (X-axis)
    sphereOffsetX += sphereVelocityX;
    
    // Update offset (Y-axis)
    sphereOffsetY += sphereVelocityY;
    
    // Enforce maximum deviation from center (X-axis)
    if (Math.abs(sphereOffsetX) > maxDeviation) {
      sphereOffsetX = Math.sign(sphereOffsetX) * maxDeviation;
      sphereVelocityX = 0; // Stop at boundary
    }
    
    // Enforce maximum deviation from center (Y-axis)
    if (Math.abs(sphereOffsetY) > maxDeviation) {
      sphereOffsetY = Math.sign(sphereOffsetY) * maxDeviation;
      sphereVelocityY = 0; // Stop at boundary
    }
    
    // Apply wobble effect when returning to center (only for X-axis movement)
    if (!keysPressed.a && !keysPressed.d && Math.abs(sphereOffsetX) > 0.1) {
      // Add smooth wobble to Y position with slower oscillation
      const wobbleAmount = Math.sin(frameCount * 0.1) * wobbleStrength * Math.abs(sphereOffsetX) * 0.5;
      sphere.position.y = originalSphereY + sphereOffsetY + wobbleAmount;
    } else {
      // Return Y to original position more smoothly and slowly
      sphere.position.y = originalSphereY + sphereOffsetY;
    }
  }

  // Function to create cluster template
  function createClusterTemplate(getRandom, starColors) {
    const clusterSize = getRandom() * 80 + 40; // Much larger clusters (was 45+15, now 80+40)
    const starCount = Math.floor(getRandom() * 600 + 300); // Much higher base star count for density
      
      const cluster = {
        stars: [],
        rendered: false,
      id: Math.random(),
      template: true
      };

      // Pre-create star data with multiple density cores within the cluster
      const densityCenters = [];
      const numCenters = Math.floor(getRandom() * 4 + 3); // 3-6 density cores
      
      for (let c = 0; c < numCenters; c++) {
        densityCenters.push({
          offset: new THREE.Vector3(
            (getRandom() - 0.5) * clusterSize * 0.7,
            (getRandom() - 0.5) * clusterSize * 0.7,
            (getRandom() - 0.5) * clusterSize * 0.7
          ),
          density: getRandom() * 0.6 + 0.4, // 0.4-1.0 density weight
          radius: getRandom() * 0.3 + 0.2 // 0.2-0.5 tightness of core
        });
      }
      
      for (let j = 0; j < starCount; j++) {
        const size = getRandom() * 0.375 + 0.0375; // Size variety: 0.0375 to 0.4125 (0.75x to 2.5x current range)
        const color = starColors[Math.floor(getRandom() * starColors.length)];
        
        // Probabilistically choose a density center based on its density weight
        const totalDensity = densityCenters.reduce((sum, c) => sum + c.density, 0);
        let randomPoint = getRandom() * totalDensity;
        let chosenCenter = densityCenters[0];
        
        for (let c = 0; c < densityCenters.length; c++) {
          randomPoint -= densityCenters[c].density;
          if (randomPoint <= 0) {
            chosenCenter = densityCenters[c];
            break;
          }
        }
        
        // Position star near chosen density center with reduced falloff
        const falloff = Math.pow(getRandom(), 0.8 + chosenCenter.radius * 0.5);
        const starOffset = new THREE.Vector3(
          chosenCenter.offset.x + (getRandom() - 0.5) * clusterSize * falloff * 0.8,
          chosenCenter.offset.y + (getRandom() - 0.5) * clusterSize * falloff * 0.7,
          chosenCenter.offset.z + (getRandom() - 0.5) * clusterSize * falloff * 0.8
        );
        
        const starData = {
        position: starOffset.clone(), // Relative position, will be set when instantiated
          originalPos: null,
          size: size,
          color: color,
          velocity: new THREE.Vector3(),
          mesh: null
        };
        starData.originalPos = starData.position.clone();
        
        cluster.stars.push(starData);
      }
      
    return cluster;
  }

  // Frame rate adaptive quality (performance cheat)
  function updateAdaptiveQuality() {
    const currentTime = performance.now();
    if (lastFrameTime > 0) {
      const deltaTime = currentTime - lastFrameTime;
      const fps = 1000 / deltaTime;
      
      frameRateHistory.push(fps);
      if (frameRateHistory.length > 30) {
        frameRateHistory.shift();
      }
      
      const avgFps = frameRateHistory.reduce((a, b) => a + b, 0) / frameRateHistory.length;
      
      // Adjust quality based on frame rate
      if (avgFps < 30) {
        adaptiveQuality = Math.max(0.3, adaptiveQuality - 0.05);
      } else if (avgFps > 50) {
        adaptiveQuality = Math.min(1.0, adaptiveQuality + 0.02);
      }
    }
    lastFrameTime = currentTime;
  }

  // Instanced rendering for distant clusters (performance cheat)
  function createInstancedCluster(cluster, distanceFromSphere) {
    if (distanceFromSphere < 40) return null; // Only for distant clusters
    
    const starCount = Math.min(cluster.stars.length, 200); // Limit instanced stars
    const geometry = new THREE.SphereGeometry(0.1, 6, 6); // Lower quality
    const material = new THREE.MeshStandardMaterial({
      emissive: 0xffffff,
      emissiveIntensity: 0.2
    });
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, starCount);
    
    // Set positions for instances
    for (let i = 0; i < starCount; i++) {
      const starData = cluster.stars[i];
      const matrix = new THREE.Matrix4();
      matrix.setPosition(starData.position);
      matrix.scale(new THREE.Vector3(starData.size * 10, starData.size * 10, starData.size * 10));
      instancedMesh.setMatrixAt(i, matrix);
      
      const color = new THREE.Color(starData.color);
      instancedMesh.setColorAt(i, color);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;
    
    return instancedMesh;
  }

  // Fake physics for non-interactive clusters (performance cheat)
  function applyFakePhysics(cluster, distanceFromSphere) {
    if (distanceFromSphere > 30) return; // Only apply to distant clusters
    
    cluster.stars.forEach(starData => {
      if (!starData.mesh) return;
      
      // Simple fake movement - slow drift
      const driftSpeed = 0.001 * (1 - distanceFromSphere / 100);
      starData.mesh.position.x += Math.sin(frameCount * 0.01 + starData.position.x) * driftSpeed;
      starData.mesh.position.y += Math.cos(frameCount * 0.008 + starData.position.y) * driftSpeed;
      starData.mesh.position.z += Math.sin(frameCount * 0.012 + starData.position.z) * driftSpeed;
    });
  }

  // Object pooling functions for better performance
  function getGeometry(size) {
    // Try to reuse existing geometry
    for (let i = 0; i < geometryPool.length; i++) {
      if (geometryPool[i].userData.size === size) {
        return geometryPool.splice(i, 1)[0];
      }
    }
    // Create new geometry if none available
    const geom = new THREE.SphereGeometry(size, 8, 8);
    geom.userData.size = size;
    return geom;
  }

  function returnGeometry(geometry) {
    if (geometryPool.length < 50) { // Limit pool size
      geometryPool.push(geometry);
    } else {
      geometry.dispose();
    }
  }

  function getMaterial(color) {
    // Try to reuse existing material
    for (let i = 0; i < materialPool.length; i++) {
      if (materialPool[i].color.getHex() === color) {
        return materialPool.splice(i, 1)[0];
      }
    }
    // Create new material if none available
    const mat = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color,
      emissiveIntensity: 0.3
    });
    return mat;
  }

  function returnMaterial(material) {
    if (materialPool.length < 50) { // Limit pool size
      materialPool.push(material);
    } else {
      material.dispose();
    }
  }

  // Function to instantiate cluster from template
  function instantiateCluster(template, centerPosition) {
    const cluster = {
      center: centerPosition.clone(),
      stars: [],
      rendered: false,
      id: Math.random(),
      // Rotation properties
      rotationSpeed: (Math.random() - 0.5) * 0.0035, // Random rotation speed between -0.00175 and 0.00175 (half of original)
      rotationAxis: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize(), // Random rotation axis
      rotationAngle: 0 // Current rotation angle
    };
    
    // Clone star data from template
    template.stars.forEach(starTemplate => {
      const starData = {
        position: starTemplate.position.clone().add(centerPosition),
        originalPos: starTemplate.originalPos.clone().add(centerPosition),
        size: starTemplate.size,
        color: starTemplate.color,
        velocity: new THREE.Vector3(),
        mesh: null
      };
      cluster.stars.push(starData);
    });
    
    return cluster;
  }

  // Pre-calculate trail colors for better performance - brighter colors
  const preCalculatedTrailColors = [];
  for (let i = 0; i < 200; i++) {
    const t = i / 200;
    const color = new THREE.Color();
    if (t < 0.5) {
      color.setHSL(0.5 + t * 0.3, 1.0, 0.9); // Increased lightness for better visibility
    } else {
      color.setHSL(0.65 + (t - 0.5) * 0.3, 1.0, 0.9); // Increased lightness for better visibility
    }
    preCalculatedTrailColors.push(color);
  }

  // Initialize the scene
  // Function to create skybox with starfield
  function createSkybox() {
    // Create starfield texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Fill with much darker blue space color
    ctx.fillStyle = '#000208'; // Much darker blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add white stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 1.5 + 0.3;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add colored stars matching cluster colors
    const clusterStarColors = ['#8800ff', '#ff00ff', '#0088ff', '#4400ff', '#00ffff']; // Purple, Pink, Blue, Violet, Aqua
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 0.5;
      const color = clusterStarColors[Math.floor(Math.random() * clusterStarColors.length)];
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // Create skybox geometry
    const skyboxGeometry = new THREE.BoxGeometry(5000, 5000, 5000); // Much larger skybox
    
    // Create materials for each face
    const skyboxMaterials = [
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }), // right
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }), // left
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }), // top
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }), // bottom
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }), // front
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })  // back
    ];
    
    // Create skybox mesh
    skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    scene.add(skybox);
  }

  function init() {

    // Seeded random number generator
    const seed = Math.random() * 10000;
    const seededRandom = (s) => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
    let randomSeed = seed;
    const getRandom = () => {
      randomSeed++;
      return seededRandom(randomSeed);
    };

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000208); // Much darker blue to match skybox
    
    // Fog removed for clearer visibility

    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 8, 18);
    
    // Initialize camera dampening positions
    cameraCurrentPosition.copy(camera.position);
    cameraLookAtCurrent.set(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 3.0; // Increased from 1.5 to 3.0 for brighter scene
    document.getElementById('canvas').appendChild(renderer.domElement);

    // Add lighting to brighten the scene
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6); // Soft white ambient light
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Create skybox with starfield
    createSkybox();

    // Initialize performance monitoring
    const fpsDisplay = createFpsDisplay();
    const performanceGraph = createPerformanceGraph();

    // Create glowing sphere
    const sphereGeom = new THREE.SphereGeometry(0.8, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffff00, // Yellow
      transparent: true,
      opacity: 0.9,
      emissive: 0xffff00,
      emissiveIntensity: 2.0 // Much stronger emissive lighting
    });
    sphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(sphere);
    
    // Add rotation properties to sphere
    sphere.userData = {
      rotationSpeeds: {
        main: 0.005,    // Main sphere rotation speed
        glow: -0.003,   // Glow layer (opposite direction)
        wave: 0.008     // Wave layer (different speed)
      },
      rotationAxes: {
        main: new THREE.Vector3(0, 1, 0),     // Y-axis rotation
        glow: new THREE.Vector3(1, 0, 0),    // X-axis rotation
        wave: new THREE.Vector3(0, 0, 1)     // Z-axis rotation
      }
    };

    // Sphere glow
    const glowGeom = new THREE.SphereGeometry(1.2, 32, 32);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xff8800, // Orange
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      emissive: 0xff8800,
      emissiveIntensity: 0.4
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.userData = { layerType: 'glow' };
    sphere.add(glow);

    // Push wave
    const waveGeom = new THREE.SphereGeometry(2, 32, 32);
    const waveMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, // Red
      transparent: true,
      opacity: 0.1,
      wireframe: true,
      emissive: 0xff4400,
      emissiveIntensity: 0.2
    });
    const wave = new THREE.Mesh(waveGeom, waveMat);
    wave.userData = { layerType: 'wave' };
    sphere.add(wave);

    // Pre-create fixed path using seed with smooth inertia-based movement
    const startZ = 0;
    let velocity = new THREE.Vector3(0, 0, 1);
    let position = new THREE.Vector3(0, 0, startZ);
    
    pathPoints.push(position.clone());
    
    for (let i = 1; i < 500; i++) {
      // Apply small random forces
      const forceX = (getRandom() - 0.5) * 0.02;
      const forceY = (getRandom() - 0.5) * 0.015;
      
      velocity.x += forceX;
      velocity.y += forceY;
      
      // Apply damping to keep movements smooth
      velocity.x *= 0.95;
      velocity.y *= 0.95;
      
      // Clamp velocity to prevent extreme movements
      velocity.x = Math.max(-0.15, Math.min(0.15, velocity.x));
      velocity.y = Math.max(-0.1, Math.min(0.1, velocity.y));
      
      // Always move forward in Z
      velocity.z = 1;
      
      // Update position
      position.x += velocity.x * 15;
      position.y += velocity.y * 15;
      position.z += 15;
      
      pathPoints.push(position.clone());
    }

    // Pre-create cluster pool (only create data, not meshes)
    const starColors = [0x8800ff, 0xff00ff, 0x0088ff, 0x4400ff, 0x00ffff]; // Purple, Pink, Blue, Violet, Aqua
    
    // Create cluster templates for pooling
    for (let i = 0; i < 20; i++) { // Pre-create 20 cluster templates
      const clusterTemplate = createClusterTemplate(getRandom, starColors);
      clusterPool.push(clusterTemplate);
    }
    
    console.log(`Created ${clusterPool.length} cluster templates`);

    // Function to manage active clusters based on sphere position
    function manageActiveClusters() {
      const spherePos = sphere.position;
      
      // Find the closest path point to determine which clusters should be active
      let closestPathIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < pathPoints.length; i++) {
        const dist = spherePos.distanceTo(pathPoints[i]);
        if (dist < minDistance) {
          minDistance = dist;
          closestPathIndex = i;
        }
      }
      
      // Determine which clusters should be active (show clusters ahead and behind)
      const clusterSpacing = 8; // Increased spacing between clusters for smoother transitions
      const lookAhead = 15; // Show clusters this many steps ahead (increased for more clusters)
      const lookBehind = 4; // Show clusters this many steps behind (increased for more clusters)
      
      const startIndex = Math.max(0, closestPathIndex - lookBehind);
      const endIndex = Math.min(pathPoints.length - 1, closestPathIndex + lookAhead);
      
      // Remove clusters that are too far away
      activeClusters = activeClusters.filter(cluster => {
        const dist = cluster.center.distanceTo(spherePos);
        if (dist > renderDistance * 2) { // Increased cleanup distance
          // Clean up cluster meshes (OPTIMIZED: Return to pool + handle instanced)
          if (cluster.instancedMesh) {
            scene.remove(cluster.instancedMesh);
            cluster.instancedMesh.geometry.dispose();
            cluster.instancedMesh.material.dispose();
            cluster.instancedMesh = null;
          }
          
          cluster.stars.forEach(starData => {
            if (starData.mesh) {
              scene.remove(starData.mesh);
              returnGeometry(starData.mesh.geometry);
              returnMaterial(starData.mesh.material);
              starData.mesh = null;
            }
          });
          return false;
        }
        return true;
      });
      
      // Add new clusters if needed (ALWAYS spawn ahead of sphere)
      for (let i = startIndex; i <= endIndex; i += clusterSpacing) {
        const pathPos = pathPoints[i];
        const distToSphere = pathPos.distanceTo(spherePos);
        
        // Only spawn clusters AHEAD of the sphere (positive distance along path)
        const isAhead = i > closestPathIndex;
        
        if (isAhead && distToSphere < renderDistance * 1.5 && activeClusters.length < maxActiveClusters) {
          // Check if cluster already exists at this position (reduced minimum distance for higher density)
          const exists = activeClusters.some(cluster => 
            cluster.center.distanceTo(pathPos) < 30
          );
          
          if (!exists) {
            // Create offset from path (reduced range for higher density)
            const offsetDistance = getRandom() * 30 + 15;
            const offset = new THREE.Vector3(
              (getRandom() - 0.5) * offsetDistance,
              (getRandom() - 0.5) * offsetDistance * 0.8,
              (getRandom() - 0.5) * offsetDistance * 0.6
            );
            
            const centerPos = pathPos.clone().add(offset);
            const template = clusterPool[Math.floor(getRandom() * clusterPool.length)];
            const newCluster = instantiateCluster(template, centerPos);
            activeClusters.push(newCluster);
            
            // Debug: Log when clusters spawn ahead
            if (frameCount % 60 === 0) {
              console.log(`Spawned cluster ahead at path index ${i}, distance from sphere: ${distToSphere.toFixed(1)}`);
            }
          }
        }
      }
    }

    // Trail with tube geometry for better visibility
    const trailMesh = new THREE.Mesh();
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6
    });
    scene.add(trailMesh);
    
    // Also keep line trail
    const trailGeom = new THREE.BufferGeometry();
    const maxTrailPoints = 200;
    const positions = new Float32Array(maxTrailPoints * 3);
    const colors = new Float32Array(maxTrailPoints * 3);
    
    // Initialize with sphere position
    for (let i = 0; i < 3; i++) {
      positions[i] = sphere.position.getComponent(i);
    }
    
    trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 12, // Increased line width for better visibility
      depthTest: false
    });
    
    const trail = new THREE.Line(trailGeom, trailMat);
    scene.add(trail);

    // Mouse events for camera orbiting
    const onMouseDown = (e) => {
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - previousMouse.x;
      const deltaY = e.clientY - previousMouse.y;
      
      cameraAngle.theta -= deltaX * 0.005;
      cameraAngle.phi -= deltaY * 0.005;
      
      cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngle.phi));
      
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.01;
      cameraDistance = Math.max(5, Math.min(40, cameraDistance));
    };

    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        targetSpeed = 1.0;
      }
      if (e.code === 'KeyM') {
        physicsMode = physicsMode === 'standard' ? 'chain' : 'standard';
        modeDisplay = physicsMode;
        updateModeDisplay();
        console.log('Physics mode:', physicsMode);
      }
      if (e.code === 'KeyA') {
        keysPressed.a = true;
      }
      if (e.code === 'KeyD') {
        keysPressed.d = true;
      }
      if (e.code === 'KeyW') {
        keysPressed.w = true;
      }
      if (e.code === 'KeyS') {
        keysPressed.s = true;
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        targetSpeed = 0.12;
      }
      if (e.code === 'KeyA') {
        keysPressed.a = false;
      }
      if (e.code === 'KeyD') {
        keysPressed.d = false;
      }
      if (e.code === 'KeyW') {
        keysPressed.w = false;
      }
      if (e.code === 'KeyS') {
        keysPressed.s = false;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Performance tracking
      const frameStartTime = performance.now();
      
      // Smooth acceleration/deceleration
      const acceleration = targetSpeed > speed ? 0.02 : 0.015;
      speed += (targetSpeed - speed) * acceleration;
      
      distanceTraveled += speed;
      
      // Calculate total path length (cached for performance)
      if (!pathLengthCalculated) {
        totalPathLength = 0;
        for (let i = 0; i < pathPoints.length - 1; i++) {
          totalPathLength += pathPoints[i].distanceTo(pathPoints[i + 1]);
        }
        pathLengthCalculated = true;
      }
      
      // Loop the distance traveled
      const loopedDistance = distanceTraveled % totalPathLength;
      
      // Find position along path
      let totalDist = 0;
      let targetPos = pathPoints[0].clone();
      
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const segmentStart = pathPoints[i];
        const segmentEnd = pathPoints[i + 1];
        const segmentLength = segmentStart.distanceTo(segmentEnd);
        
        if (totalDist + segmentLength >= loopedDistance) {
          const t = (loopedDistance - totalDist) / segmentLength;
          targetPos.lerpVectors(segmentStart, segmentEnd, t);
          break;
        }
        
        totalDist += segmentLength;
      }
      
      sphere.position.copy(targetPos);

      // Store original Y position for wobble effect (only once)
      if (originalSphereY === 0) {
        originalSphereY = sphere.position.y;
      }

      // Apply sphere movement controls
      updateSphereMovement();
      
      // Apply X offset to sphere position
      sphere.position.x += sphereOffsetX;
      
      // Apply Y offset to sphere position
      sphere.position.y += sphereOffsetY;

      // Move skybox to follow sphere (maintains constant distance)
      if (skybox) {
        skybox.position.copy(sphere.position);
      }

      // Apply multi-layer rotation to sphere
      if (sphere.userData && sphere.userData.rotationSpeeds) {
        // Rotate main sphere
        sphere.rotateOnAxis(sphere.userData.rotationAxes.main, sphere.userData.rotationSpeeds.main);
        
        // Rotate child layers
        sphere.children.forEach(child => {
          if (child.userData && child.userData.layerType) {
            const layerType = child.userData.layerType;
            if (sphere.userData.rotationSpeeds[layerType] && sphere.userData.rotationAxes[layerType]) {
              child.rotateOnAxis(
                sphere.userData.rotationAxes[layerType], 
                sphere.userData.rotationSpeeds[layerType]
              );
            }
          }
        });
      }

      // Manage active clusters (only 3-5 clusters active at once)
      manageActiveClusters();

      // Render all active clusters with LOD (Level of Detail)
      activeClusters.forEach(cluster => {
        const distToCluster = cluster.center.distanceTo(sphere.position);
        
        if (distToCluster < renderDistance) {
          // Determine LOD level based on distance
          let lodLevel = 0;
          for (let i = 0; i < lodDistances.length; i++) {
            if (distToCluster > lodDistances[i]) {
              lodLevel = i + 1;
            }
          }
          
          // Render this cluster if not already rendered (DYNAMIC LOD based on distance to orb)
          if (!cluster.rendered) {
            // Smart dynamic LOD: Adaptive star density based on performance
            const distToSphere = cluster.center.distanceTo(sphere.position);
            const dynamicMultiplier = getDynamicDensityMultiplier(distToSphere);
            
            const starCount = Math.max(30, Math.floor(cluster.stars.length * dynamicMultiplier * adaptiveQuality));
            
            // Debug: Log dynamic LOD calculation
            if (frameCount % 30 === 0) {
              console.log(`Dynamic LOD: Distance to sphere: ${distToSphere.toFixed(1)}, Multiplier: ${dynamicMultiplier.toFixed(2)}, Adaptive: ${adaptiveQuality.toFixed(2)}, Final count: ${starCount}/${cluster.stars.length}`);
            }
            
            // Temporarily disable instanced rendering for debugging
            // if (lodLevel >= 2 && distToCluster > 40) {
            //   // Use instanced rendering for very distant clusters
            //   const instancedMesh = createInstancedCluster(cluster, distToCluster);
            //   if (instancedMesh) {
            //     scene.add(instancedMesh);
            //     cluster.instancedMesh = instancedMesh;
            //     cluster.rendered = true;
            //     return;
            //   }
            // }
            
            // Instanced rendering with LOD + Color grouping
            let meshesCreated = 0;
            const colorGroups = new Map();
            
            // Group stars by color
            for (let i = 0; i < starCount; i++) {
              const starData = cluster.stars[i];
              const colorKey = starData.color; // Use color string directly
              
              if (!colorGroups.has(colorKey)) {
                colorGroups.set(colorKey, []);
              }
              colorGroups.get(colorKey).push(starData);
            }
            
            // Create instanced meshes for each color group
            colorGroups.forEach((stars, colorKey) => {
              const color = new THREE.Color(colorKey); // colorKey is already a hex string
              const instancedMesh = createInstancedMesh(color, false); // Start with 3D meshes
              
              stars.forEach((starData, index) => {
                if (index < MAX_INSTANCES_PER_MESH) {
                  addStarToInstancedMesh(instancedMesh, starData, index);
                  starData.instancedIndex = index;
                  starData.instancedMesh = instancedMesh;
                  meshesCreated++;
                }
              });
              
              instancedMesh.count = Math.min(stars.length, MAX_INSTANCES_PER_MESH);
              scene.add(instancedMesh);
            });
            
            cluster.rendered = true;
            cluster.instancedMeshes = Array.from(colorGroups.keys()).map(colorKey => {
              return scene.children.find(child => 
                child.isInstancedMesh && 
                child.material.color.getHexString() === new THREE.Color(colorKey).getHexString()
              );
            });
            
            // Debug: Log cluster rendering
            if (frameCount % 30 === 0) {
              console.log(`Rendered cluster with ${meshesCreated} meshes at distance: ${distToCluster.toFixed(1)}`);
            }
          } else if (lodLevel >= 1) {
            // Apply fake physics to non-interactive clusters
            applyFakePhysics(cluster, distToCluster);
          }
          
          // Always apply gentle return force to all rendered stars (even when sphere is far away)
          if (cluster.rendered) {
            cluster.stars.forEach(starData => {
              if (starData.velocity && starData.velocity.length() > 0.001) {
                // Apply very gentle return force to slowly drift back to original position
                const returnForce = new THREE.Vector3()
                  .subVectors(starData.originalPos, starData.position)
                  .multiplyScalar(0.001); // Very gentle drift back
                starData.velocity.add(returnForce);
                
                // Apply velocity and damping
                starData.position.add(starData.velocity);
                starData.velocity.multiplyScalar(0.998); // Very gentle damping
                
                // Update instanced mesh position
                updateInstancedStarPosition(starData);
              }
            });
          }
          
          // Apply slow rotation to cluster
          if (cluster.rendered && cluster.stars.length > 0) {
            cluster.rotationAngle += cluster.rotationSpeed;
            
            // Create rotation matrix
            const rotationMatrix = new THREE.Matrix4().makeRotationAxis(cluster.rotationAxis, cluster.rotationAngle);
            
            // Apply rotation to all star meshes
            cluster.stars.forEach(starData => {
              if (starData.mesh) {
                // Get relative position from cluster center
                const relativePos = starData.position.clone().sub(cluster.center);
                
                // Apply rotation
                relativePos.applyMatrix4(rotationMatrix);
                
                // Set new position
                starData.mesh.position.copy(cluster.center.clone().add(relativePos));
              }
            });
          }
        }
      });

      // Debug: Log cluster detection every 30 frames
      if (frameCount % 30 === 0) {
        console.log(`Active clusters: ${activeClusters.length}`);
        activeClusters.forEach((cluster, i) => {
          const dist = cluster.center.distanceTo(sphere.position);
          const renderedStars = cluster.stars.filter(star => star.mesh).length;
          console.log(`Cluster ${i}: Distance: ${dist.toFixed(1)}, Rendered: ${cluster.rendered}, Stars: ${renderedStars}/${cluster.stars.length}`);
        });
      }
      
      // Find the 2 closest clusters the sphere can interact with
      let currentClusters = [];
      let clusterDistances = [];
      
      for (let i = 0; i < activeClusters.length; i++) {
        const cluster = activeClusters[i];
        const dist = cluster.center.distanceTo(sphere.position);
        
        // Only consider clusters within interaction range
        if (dist < 20) {
          clusterDistances.push({ cluster: cluster, distance: dist });
        }
      }
      
      // Sort by distance and take the 2 closest
      clusterDistances.sort((a, b) => a.distance - b.distance);
      currentClusters = clusterDistances.slice(0, 2).map(item => item.cluster);

      // Process physics for up to 2 clusters
      if (currentClusters.length > 0) {
        // Debug: Log physics interaction
        if (frameCount % 30 === 0) {
          console.log(`Physics active on ${currentClusters.length} cluster(s), Mode: ${physicsMode}`);
          currentClusters.forEach((cluster, index) => {
            const dist = cluster.center.distanceTo(sphere.position);
            console.log(`Cluster ${index + 1}: Distance: ${dist.toFixed(1)}, Stars: ${cluster.stars.length}`);
          });
        }
          
        // Update star physics based on mode (for up to 2 clusters)
        if (physicsMode === 'standard') {
          // Standard mode - only sphere pushes stars
          let totalStarsProcessed = 0;
          let totalStarsPushed = 0;
          
          currentClusters.forEach(cluster => {
            let starsProcessed = 0;
            let starsPushed = 0;
            
            cluster.stars.forEach(starData => {
              if (!starData.instancedMesh) return;
              
              const dist = starData.position.distanceTo(sphere.position);
              const pushRadius = 16; // Reduced to 65% of original (25 * 0.65 = 16.25)
              
              // Only process stars within interaction range for better performance
              if (dist < pushRadius * 2) { // Process stars within 2x push radius
                starsProcessed++;
              
              if (dist < pushRadius) {
                  // Much gentler force calculation with smoother falloff
                  const normalizedDist = dist / pushRadius;
                  const force = Math.pow(1 - normalizedDist, 2) * 0.8; // Increased force for stronger effect
                const direction = new THREE.Vector3()
                  .subVectors(starData.position, sphere.position)
                  .normalize();
                
                starData.velocity.add(direction.multiplyScalar(force));
                  starsPushed++;
                  
                  // Debug: Log when stars are being pushed
                  if (frameCount % 30 === 0 && force > 0.05) {
                    console.log(`Pushing star! Force: ${force.toFixed(3)}, Distance: ${dist.toFixed(1)}`);
                  }
                }
                
                // Apply physics only to nearby stars
                starData.position.add(starData.velocity);
                starData.velocity.multiplyScalar(0.995); // Much gentler damping for smoother movement
                
                // Update instanced mesh position
                updateInstancedStarPosition(starData);
              
              const returnForce = new THREE.Vector3()
                .subVectors(starData.originalPos, starData.position)
                  .multiplyScalar(0.002); // Even gentler return force for very slow drift back
              starData.velocity.add(returnForce);
              }
            });
            
            // Debug: Log physics processing for this cluster
            if (frameCount % 30 === 0) {
              console.log(`Cluster physics: ${starsProcessed} nearby stars, ${starsPushed} pushed`);
            }
            
            totalStarsProcessed += starsProcessed;
            totalStarsPushed += starsPushed;
          });
          
          // Debug: Log total physics processing
          if (frameCount % 30 === 0) {
            console.log(`Total physics: ${totalStarsProcessed} stars processed, ${totalStarsPushed} pushed across ${currentClusters.length} clusters`);
          }
          } else {
          // Chain mode - stars push each other (for up to 2 clusters)
          let totalStarsProcessed = 0;
          let totalStarsPushed = 0;
          
          currentClusters.forEach(cluster => {
            let starsProcessed = 0;
            let starsPushed = 0;
            
            cluster.stars.forEach(starData => {
              if (!starData.instancedMesh) return;
              
              // Sphere pushes stars
              const dist = starData.position.distanceTo(sphere.position);
              const pushRadius = 16; // Reduced to 65% of original (25 * 0.65 = 16.25)
              
              if (dist < pushRadius) {
                // Much gentler force calculation with smoother falloff
                const normalizedDist = dist / pushRadius;
                const force = Math.pow(1 - normalizedDist, 2) * 0.8; // Increased force for stronger effect
                const direction = new THREE.Vector3()
                  .subVectors(starData.position, sphere.position)
                  .normalize();
                
                starData.velocity.add(direction.multiplyScalar(force));
              }
            });
            
            // Stars push each other (within this cluster)
            cluster.stars.forEach((starData, idx) => {
              if (!starData.instancedMesh) return;
              
            // Skip static stars to reduce collision checks
            if (starData.velocity.length() < 0.02) return; // Higher threshold for gentler interaction
            
            cluster.stars.forEach((otherStar, otherIdx) => {
                if (idx === otherIdx || !otherStar.instancedMesh) return;
              
              // Spatial partitioning: Quick distance check using bounding box
              const dx = Math.abs(starData.position.x - otherStar.position.x);
              const dy = Math.abs(starData.position.y - otherStar.position.y);
              const dz = Math.abs(starData.position.z - otherStar.position.z);
              
              if (dx > 4 || dy > 4 || dz > 4) return; // Slightly larger interaction area
                
                const dist = starData.position.distanceTo(otherStar.position);
                const interactionRadius = 4; // Increased interaction radius
                
                if (dist < interactionRadius && dist > 0.1) {
                  const velocityMagnitude = starData.velocity.length();
                  
                  if (velocityMagnitude > 0.02) { // Higher threshold for gentler interaction
                    // Gentler force calculation with smoother falloff
                    const normalizedDist = dist / interactionRadius;
                    const force = Math.pow(1 - normalizedDist, 2) * velocityMagnitude * 0.2; // Increased force for stronger star interactions
                    const direction = new THREE.Vector3()
                      .subVectors(otherStar.position, starData.position)
                      .normalize();
                    
                    otherStar.velocity.add(direction.multiplyScalar(force));
                  }
                }
              });
            });
            
            // Apply velocity and damping for this cluster
            cluster.stars.forEach(starData => {
              if (!starData.instancedMesh) return;
              
              starData.position.add(starData.velocity);
              starData.velocity.multiplyScalar(0.995); // Much gentler damping for smoother movement
              
              // Update instanced mesh position
              updateInstancedStarPosition(starData);
              
              const returnForce = new THREE.Vector3()
                .subVectors(starData.originalPos, starData.position)
                .multiplyScalar(0.002); // Even gentler return force for very slow drift back
              starData.velocity.add(returnForce);
            });
            
            totalStarsProcessed += starsProcessed;
            totalStarsPushed += starsPushed;
          });
          
          // Debug: Log total chain mode physics
          if (frameCount % 30 === 0) {
            console.log(`Chain mode: ${totalStarsProcessed} stars processed, ${totalStarsPushed} pushed across ${currentClusters.length} clusters`);
          }
        }
      }


      // Update trail - add new position (OPTIMIZED: Throttled updates)
      trailUpdateCounter++;
      if (trailUpdateCounter % 2 === 0) { // Update every other frame
        trailPoints.unshift(sphere.position.clone());
        if (trailPoints.length > maxTrailPoints) {
          trailPoints.pop();
        }
      }

      const trailPositions = trail.geometry.attributes.position.array;
      const trailColors = trail.geometry.attributes.color.array;
      
      // Update all trail points
      for (let i = 0; i < trailPoints.length; i++) {
        const point = trailPoints[i];
        trailPositions[i * 3] = point.x;
        trailPositions[i * 3 + 1] = point.y;
        trailPositions[i * 3 + 2] = point.z;
        
        // Bright gradient colors (OPTIMIZED: Use pre-calculated colors)
        const colorIndex = Math.floor((i / trailPoints.length) * (preCalculatedTrailColors.length - 1));
        const color = preCalculatedTrailColors[colorIndex];
        
        trailColors[i * 3] = color.r;
        trailColors[i * 3 + 1] = color.g;
        trailColors[i * 3 + 2] = color.b;
      }
      
      trail.geometry.attributes.position.needsUpdate = true;
      trail.geometry.attributes.color.needsUpdate = true;
      trail.geometry.setDrawRange(0, trailPoints.length);

      // Camera orbit controls
      const theta = cameraAngle.theta;
      const phi = cameraAngle.phi;
      const radius = cameraDistance;
      
      const camX = sphere.position.x + radius * Math.sin(phi) * Math.cos(theta);
      const camY = sphere.position.y + radius * Math.cos(phi);
      const camZ = sphere.position.z + radius * Math.sin(phi) * Math.sin(theta);
      
      // Set target camera position
      cameraTargetPosition.set(camX, camY, camZ);
      
      // Smoothly interpolate camera position towards target
      cameraCurrentPosition.lerp(cameraTargetPosition, cameraDampening);
      camera.position.copy(cameraCurrentPosition);
      
      // Set target look-at position
      cameraLookAtTarget.copy(sphere.position);
      
      // Smoothly interpolate look-at position towards target
      cameraLookAtCurrent.lerp(cameraLookAtTarget, lookAtDampening);
      camera.lookAt(cameraLookAtCurrent);

      // Update adaptive quality based on frame rate
      updateAdaptiveQuality();
      
      // Update smart density scaling based on performance
      updateSmartDensityScaling();
      
      // Update particle tail - thin tail
      updateTailParticles();

      // Debug: Log sphere position every 60 frames
      if (frameCount % 60 === 0) {
        console.log(`Sphere position: (${sphere.position.x.toFixed(1)}, ${sphere.position.y.toFixed(1)}, ${sphere.position.z.toFixed(1)})`);
      }
      if (frameCount % 60 === 0) {
        let activeStars = 0;
        let renderedClusters = 0;
        activeClusters.forEach(cluster => {
          if (cluster.rendered) {
            activeStars += cluster.stars.length;
            renderedClusters++;
          }
        });
        console.log(`Performance: Active clusters: ${activeClusters.length}, Rendered: ${renderedClusters}, Active stars: ${activeStars}, Geometry pool: ${geometryPool.length}, Material pool: ${materialPool.length}, Adaptive quality: ${adaptiveQuality.toFixed(2)}, Interacting clusters: ${currentClusters.length}`);
        
        // Update performance metrics
        performanceMetrics.starCount = activeStars;
        performanceMetrics.clusterCount = activeClusters.length;
      }

      frameCount++;
      
      // Performance tracking - render time
      const renderStartTime = performance.now();
      renderer.render(scene, camera);
      performanceMetrics.renderTime = performance.now() - renderStartTime;
      
      // Calculate FPS
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      if (deltaTime > 0) {
        currentFps = 1000 / deltaTime;
        fpsHistory.push(currentFps);
        
        // Keep only last 60 frames for average
        if (fpsHistory.length > 60) {
          fpsHistory.shift();
        }
        
        // Calculate average FPS
        averageFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
        
        // Update min/max
        minFps = Math.min(minFps, currentFps);
        maxFps = Math.max(maxFps, currentFps);
        
        // Update displays every 10 frames
        if (frameCount % 10 === 0) {
          updateFpsDisplay(fpsDisplay);
          updatePerformanceGraph(performanceGraph);
        }
      }
      
      lastFrameTime = currentTime;
      performanceMetrics.totalFrameTime = currentTime - frameStartTime;
    };
    animate();

    // Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Start animation
    animate();
  }

  // Function to update mode display
  function updateModeDisplay() {
    const modeElement = document.getElementById('mode-display');
    if (modeElement) {
      modeElement.textContent = `Physics Mode: ${modeDisplay === 'standard' ? 'Standard' : 'Chain Reaction'}`;
    }
  }

  // Performance monitoring functions
  function createFpsDisplay() {
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fps-display';
    fpsDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      color: #00ff00;
      font-family: monospace;
      font-size: 14px;
      background: rgba(0,0,0,0.8);
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #333;
      z-index: 1000;
      min-width: 120px;
    `;
    document.body.appendChild(fpsDiv);
    return fpsDiv;
  }

  function createPerformanceGraph() {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    canvas.id = 'performance-graph';
    canvas.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      border: 1px solid #333;
      border-radius: 4px;
      z-index: 1000;
    `;
    document.body.appendChild(canvas);
    return canvas;
  }

  function updateFpsDisplay(fpsDiv) {
    const statusColor = averageFps >= 55 ? '#00ff00' : averageFps >= 30 ? '#ffff00' : '#ff0000';
    const statusText = averageFps >= 55 ? '● Excellent' : averageFps >= 30 ? '● Good' : '● Poor';
    
    fpsDiv.innerHTML = `
      <div style="color: ${statusColor}; font-weight: bold;">FPS: ${currentFps.toFixed(1)}</div>
      <div style="color: #ccc;">Avg: ${averageFps.toFixed(1)}</div>
      <div style="color: #ccc;">Min: ${minFps.toFixed(1)}</div>
      <div style="color: #ccc;">Max: ${maxFps.toFixed(1)}</div>
      <div style="color: ${statusColor}; font-size: 12px;">${statusText}</div>
    `;
  }

  function updatePerformanceGraph(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw FPS line
    if (fpsHistory.length > 1) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const maxFps = Math.max(...fpsHistory);
      const minFps = Math.min(...fpsHistory);
      const fpsRange = maxFps - minFps || 1;
      
      fpsHistory.forEach((fps, index) => {
        const x = (index / (fpsHistory.length - 1)) * width;
        const y = height - ((fps - minFps) / fpsRange) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
    
    // Draw performance zones
    ctx.fillStyle = 'rgba(0,255,0,0.1)';
    ctx.fillRect(0, 0, width, height * 0.25); // 60+ FPS zone
    
    ctx.fillStyle = 'rgba(255,255,0,0.1)';
    ctx.fillRect(0, height * 0.25, width, height * 0.5); // 30-60 FPS zone
    
    ctx.fillStyle = 'rgba(255,0,0,0.1)';
    ctx.fillRect(0, height * 0.75, width, height * 0.25); // <30 FPS zone
  }

  function getPerformanceSuggestions() {
    const suggestions = [];
    
    if (averageFps < 30) {
      suggestions.push("Consider reducing star density multipliers");
      suggestions.push("Enable instanced rendering for distant clusters");
    }
    
    if (performanceMetrics.starCount > 5000) {
      suggestions.push("High star count detected - consider LOD optimization");
    }
    
    if (performanceMetrics.physicsTime > 5) {
      suggestions.push("Physics calculations taking too long - reduce interaction radius");
    }
    
    if (performanceMetrics.renderTime > 10) {
      suggestions.push("Rendering performance low - consider 2D sprites for distant stars");
    }
    
    if (densityScalingEnabled && averageFps < performanceTargetFPS) {
      suggestions.push(`Smart scaling active: Target ${performanceTargetFPS} FPS, Current ${averageFps.toFixed(1)} FPS`);
    }
    
    return suggestions;
  }

  // Smart density scaling system
  let densityScalingEnabled = true;
  let baseDensityMultipliers = [2.5, 2.0, 1.5, 1.0, 0.7, 0.4]; // Base multipliers for different distances
  let currentDensityMultipliers = [...baseDensityMultipliers]; // Current active multipliers
  let performanceTargetFPS = 55; // Target FPS for quality scaling
  let densityUpdateCounter = 0;
  const DENSITY_UPDATE_INTERVAL = 60; // Update density every 60 frames
  
  function updateSmartDensityScaling() {
    if (!densityScalingEnabled) return;
    
    densityUpdateCounter++;
    if (densityUpdateCounter < DENSITY_UPDATE_INTERVAL) return;
    densityUpdateCounter = 0;
    
    // Calculate performance ratio
    const performanceRatio = averageFps / performanceTargetFPS;
    
    // Adjust density multipliers based on performance
    if (performanceRatio < 0.8) {
      // Performance is poor, reduce density
      currentDensityMultipliers = currentDensityMultipliers.map(multiplier => 
        Math.max(multiplier * 0.9, 0.1) // Reduce by 10%, minimum 0.1
      );
      
      if (frameCount % 60 === 0) {
        console.log(`Performance low (${averageFps.toFixed(1)} FPS), reducing density multipliers`);
      }
    } else if (performanceRatio > 1.2) {
      // Performance is good, can increase density
      currentDensityMultipliers = currentDensityMultipliers.map((multiplier, index) => 
        Math.min(multiplier * 1.05, baseDensityMultipliers[index]) // Increase by 5%, max to base
      );
      
      if (frameCount % 60 === 0) {
        console.log(`Performance good (${averageFps.toFixed(1)} FPS), increasing density multipliers`);
      }
    }
    
    // Debug: Log current multipliers
    if (frameCount % 120 === 0) {
      console.log(`Density multipliers: [${currentDensityMultipliers.map(m => m.toFixed(2)).join(', ')}]`);
    }
  }

  function getDynamicDensityMultiplier(distToSphere) {
    if (!densityScalingEnabled) {
      // Use original logic if smart scaling is disabled
      if (distToSphere < 15) return 2.5;
      if (distToSphere < 25) return 2.0;
      if (distToSphere < 35) return 1.5;
      if (distToSphere < 50) return 1.0;
      if (distToSphere < 70) return 0.7;
      return 0.4;
    }
    
    // Use smart scaling multipliers
    if (distToSphere < 15) return currentDensityMultipliers[0];
    if (distToSphere < 25) return currentDensityMultipliers[1];
    if (distToSphere < 35) return currentDensityMultipliers[2];
    if (distToSphere < 50) return currentDensityMultipliers[3];
    if (distToSphere < 70) return currentDensityMultipliers[4];
    return currentDensityMultipliers[5];
  }

  // Color-based instanced rendering system
  let colorGroups = new Map(); // Map of color -> InstancedMesh
  let instancedMeshes = new Map(); // Map of color -> InstancedMesh for 3D stars
  let instancedSprites = new Map(); // Map of color -> InstancedMesh for 2D sprites
  const MAX_INSTANCES_PER_MESH = 1000; // Maximum instances per InstancedMesh
  
  // Hybrid rendering system
  function createStarSpriteTexture(starData) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    // Use star data to create consistent but varied shapes
    const seed = starData.position.x + starData.position.y + starData.position.z;
    const seededRandom = (s) => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
    
    // Create irregular star shape with 6-8 edges
    const centerX = 8;
    const centerY = 8;
    const numPoints = 6 + Math.floor(seededRandom(seed) * 3); // 6-8 points
    const baseRadius = 4 + starData.size * 4; // Size-based radius
    const variation = 1.5; // Random variation in radius
    
    ctx.beginPath();
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = baseRadius + (seededRandom(seed + i) - 0.5) * variation;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  function shouldUseSprite(distanceFromCamera) {
    return distanceFromCamera > 20; // Use sprites for distant stars
  }

  function updateInstancedStarPosition(starData) {
    if (starData.instancedMesh && starData.instancedIndex !== undefined) {
      const matrix = new THREE.Matrix4();
      const scale = starData.size * (shouldUseSprite(starData.position.distanceTo(camera.position)) ? 6 : 1);
      
      matrix.compose(
        starData.position,
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale)
      );
      
      starData.instancedMesh.setMatrixAt(starData.instancedIndex, matrix);
      starData.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  function createInstancedMesh(color, isSprite = false) {
    const geometry = isSprite ? 
      new THREE.PlaneGeometry(1, 1) : // For sprites, use plane geometry
      new THREE.SphereGeometry(0.1, 8, 6); // For 3D stars, use small sphere
    
    const material = isSprite ?
      new THREE.MeshBasicMaterial({
        map: createStarSpriteTexture({ color: color, size: 0.1, position: new THREE.Vector3() }),
        transparent: true,
        alphaTest: 0.05
      }) :
      getMaterial(color);
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCES_PER_MESH);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return instancedMesh;
  }

  function addStarToInstancedMesh(instancedMesh, starData, index) {
    const matrix = new THREE.Matrix4();
    const scale = starData.size * (shouldUseSprite(starData.position.distanceTo(camera.position)) ? 6 : 1);
    
    matrix.compose(
      starData.position,
      new THREE.Quaternion(),
      new THREE.Vector3(scale, scale, scale)
    );
    
    instancedMesh.setMatrixAt(index, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  function createStarMesh(starData, distanceFromCamera) {
    // For now, keep individual meshes for compatibility
    // TODO: Convert to instanced rendering
    if (shouldUseSprite(distanceFromCamera)) {
      // Create 2D sprite with unique texture
      const spriteTexture = createStarSpriteTexture(starData);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: spriteTexture,
        color: starData.color,
        transparent: true,
        alphaTest: 0.05
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(starData.size * 6, starData.size * 6, 1);
      return sprite;
    } else {
      // Create 3D sphere
      const starGeom = getGeometry(starData.size);
      const starMat = getMaterial(starData.color);
      const mesh = new THREE.Mesh(starGeom, starMat);
      return mesh;
    }
  }

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();