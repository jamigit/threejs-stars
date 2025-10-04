// Three.js Stars - Vanilla JavaScript Version
(function() {
  // Variables to store references
  let scene, camera, renderer, sphere;
  let skybox;
  let pathPoints = [];
  let trailPoints = [];
  let starClusters = [];
  let distanceTraveled = 0;
  let speed = 0.04; // Reduced from 0.12 for slower movement
  let targetSpeed = 0.04; // Reduced from 0.12 for slower movement
  
  // Time-based movement control
  let timeScale = 0.3; // Global speed multiplier (0.3 = 30% of original speed)
  let lastTime = 0;
  let isDragging = false;
  let previousMouse = { x: 0, y: 0 };
  let cameraAngle = { theta: -Math.PI / 2, phi: Math.PI / 4 };
  let cameraDistance = 35; // Increased initial zoom for better overview
  let renderDistance = 100;
  let physicsMode = 'standard'; // 'standard' or 'chain'
  let modeDisplay = 'standard';
  
  // Force field settings
  let forceFieldRadius = 12; // Adjustable force field radius
  let forceFieldMesh = null; // Reference to force field visualization
  
  // Heat effect system (optimized)
  let heatIntensity = 0; // Current heat intensity (0-1)
  let heatDecayRate = 0.015; // How fast heat fades (per frame)
  let maxHeatIntensity = 1.0; // Maximum heat intensity
  let lastHeatUpdate = 0; // Track last update to avoid unnecessary material updates
  
  // Hit mark system
  let hitMarks = []; // Array of temporary hit marks on force field
  let maxHitMarks = 20; // Maximum number of hit marks visible at once
  
  // Performance optimization variables
  let activeClusters = []; // Only 8-10 clusters active at once (increased for higher density)
  let maxActiveClusters = 10;
  let currentClusterIndex = 0; // Index of cluster sphere is currently interacting with
  let clusterPool = []; // Pool of pre-created cluster data
  let frameCount = 0;
  
  // Particle tail system - red and orange particle tail
  let tailParticles = [];
  let maxTailParticles = 200; // Increased for wider tail
  let tailParticleGeometry = new THREE.SphereGeometry(0.24, 12, 12); // Much larger particles for better visibility
  let tailColors = [0xff0000, 0xff4400]; // Red and orange colors
  
  // Additional performance optimizations
  let totalPathLength = 0; // Cache path length calculation
  let pathLengthCalculated = false;
  let geometryPool = []; // Pool of geometries
  let materialPool = []; // Pool of materials
  let trailUpdateCounter = 0; // Throttle trail updates
  
  // LOD (Level of Detail) system
  let lodDistances = [20, 50, 100]; // Distance thresholds for LOD (increased for better visibility)
  let lodMultipliers = [1.0, 0.9, 0.7]; // Increased minimum star density
  let lodGeometries = []; // Different geometry qualities
  
  // Frame rate adaptive quality
  let frameRateHistory = [];
  let adaptiveQuality = 1.0; // Quality multiplier
  let lastFrameTime = 0;
  
  // Distance-based effects optimization variables
  let physicsUpdateCounter = 0;
  const PHYSICS_UPDATE_INTERVAL = 1; // Update physics every frame for responsiveness
  let starUpdateIndex = 0; // For staggered star updates
  const STARS_PER_FRAME = 50; // Process this many stars per frame for staggered updates
  
  // Star size categories for mass-based physics
  const STAR_SIZE_CATEGORIES = {
    SMALL: { min: 0.075, max: 0.2, mass: 3.0, name: 'small' },
    MEDIUM: { min: 0.2, max: 0.4, mass: 4.5, name: 'medium' },
    LARGE: { min: 0.4, max: 0.6, mass: 6.5, name: 'large' },
    GIANT: { min: 0.6, max: 0.825, mass: 10.0, name: 'giant' }
  };
  
  // Pre-calculated inverse masses for faster physics calculations (UPDATED for new mass values)
  const INVERSE_MASSES = {
    SMALL: 0.333,  // 1/3.0 = 0.333
    MEDIUM: 0.222, // 1/4.5 = 0.222
    LARGE: 0.154,  // 1/6.5 = 0.154
    GIANT: 0.1     // 1/10.0 = 0.1
  };
  
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
  let sphereOffsetZ = 0; // Current Z offset from original position
  let sphereVelocityZ = 0; // Z velocity for smooth movement
  let keysPressed = { a: false, d: false, w: false, s: false, space: false }; // Track which keys are pressed
  let originalSphereY = 0; // Store original Y position for wobble effect

  // Star size categorization and mass-based physics functions
  function getStarSizeCategory(size) {
    if (size >= STAR_SIZE_CATEGORIES.GIANT.min) return 'GIANT';
    if (size >= STAR_SIZE_CATEGORIES.LARGE.min) return 'LARGE';
    if (size >= STAR_SIZE_CATEGORIES.MEDIUM.min) return 'MEDIUM';
    return 'SMALL';
  }
  
  function categorizeStarsBySize(cluster) {
    const categorizedStars = {
      SMALL: [],
      MEDIUM: [],
      LARGE: [],
      GIANT: []
    };
    
    cluster.stars.forEach(starData => {
      if (starData.instancedMesh) {
        const category = getStarSizeCategory(starData.size);
        starData.sizeCategory = category;
        starData.inverseMass = INVERSE_MASSES[category];
        categorizedStars[category].push(starData);
      }
    });
    
    return categorizedStars;
  }

  // Function to update force field size
  function updateForceFieldSize() {
    if (forceFieldMesh) {
      // Create new geometry with updated radius
      const newGeometry = new THREE.SphereGeometry(forceFieldRadius, 32, 32);
      
      // Dispose old geometry to prevent memory leaks
      forceFieldMesh.geometry.dispose();
      
      // Apply new geometry
      forceFieldMesh.geometry = newGeometry;
      
      console.log(`Force field radius: ${forceFieldRadius}`);
    }
  }

  // Heat effect system functions
  function updateHeatEffect() {
    // Only update if heat intensity changed significantly (performance optimization)
    const currentHeat = heatIntensity;
    
    // Decay heat over time
    if (heatIntensity > 0) {
      heatIntensity = Math.max(0, heatIntensity - heatDecayRate);
      
      // Only update material if heat changed significantly (avoid unnecessary updates)
      const heatChanged = Math.abs(currentHeat - heatIntensity) > 0.01;
      
      if (heatChanged && forceFieldMesh && forceFieldMesh.material) {
        const material = forceFieldMesh.material;
        
        // Pre-calculate colors (performance optimization)
        const coolColor = new THREE.Color(0x0088aa); // Darker cyan (matches base color)
        const hotColor = new THREE.Color(0xff0000);  // Bright red
        
        // Mix colors based on heat intensity
        material.color.lerpColors(coolColor, hotColor, heatIntensity);
        
        // Update emissive properties
        material.emissiveIntensity = 0.4 + (heatIntensity * 1.6); // 0.4 to 2.0
        material.opacity = 0.25 + (heatIntensity * 0.4); // 0.25 to 0.65
        
        // Mark material as needing update
        material.needsUpdate = true;
        lastHeatUpdate = frameCount;
      }
    }
  }

  function triggerHeatEffect(intensity = 0.3) {
    // Add heat intensity (cap at maximum)
    heatIntensity = Math.min(maxHeatIntensity, heatIntensity + intensity);
  }

  // Hit mark system functions
  function createHitMark(hitPosition, intensity = 0.5) {
    // Create a larger, more visible glowing sphere at the hit location
    const hitGeometry = new THREE.SphereGeometry(0.8, 12, 8); // Larger hit mark
    const hitMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Bright red
      transparent: true,
      opacity: Math.max(0.8, intensity), // Much more opaque
      emissive: 0xff0000,
      emissiveIntensity: Math.max(2.0, intensity * 3) // Much brighter
    });
    
    const hitMark = new THREE.Mesh(hitGeometry, hitMaterial);
    
    // Position the hit mark on the force field surface
    const direction = hitPosition.clone().sub(sphere.position).normalize();
    const surfacePosition = sphere.position.clone().add(direction.multiplyScalar(forceFieldRadius));
    hitMark.position.copy(surfacePosition);
    
    // Add to scene
    scene.add(hitMark);
    
    // Store hit mark data
    const hitData = {
      mesh: hitMark,
      intensity: Math.max(0.9, intensity), // Start very visible
      decayRate: 0.01, // Slower decay
      maxLifetime: 180 // frames (3 seconds at 60fps)
    };
    
    hitMarks.push(hitData);
    
    // Limit number of hit marks
    if (hitMarks.length > maxHitMarks) {
      const oldHit = hitMarks.shift();
      scene.remove(oldHit.mesh);
      oldHit.mesh.geometry.dispose();
      oldHit.mesh.material.dispose();
    }
  }

  function updateHitMarks() {
    // Update all hit marks (optimized for performance)
    for (let i = hitMarks.length - 1; i >= 0; i--) {
      const hitData = hitMarks[i];
      
      // Decay intensity
      hitData.intensity -= hitData.decayRate;
      hitData.maxLifetime--;
      
      if (hitData.intensity <= 0 || hitData.maxLifetime <= 0) {
        // Remove expired hit mark
        scene.remove(hitData.mesh);
        hitData.mesh.geometry.dispose();
        hitData.mesh.material.dispose();
        hitMarks.splice(i, 1);
      } else {
        // Only update material if intensity changed significantly (performance optimization)
        const oldOpacity = hitData.mesh.material.opacity;
        const newOpacity = hitData.intensity;
        
        if (Math.abs(oldOpacity - newOpacity) > 0.05) {
          hitData.mesh.material.opacity = newOpacity;
          hitData.mesh.material.emissiveIntensity = newOpacity * 2;
          hitData.mesh.material.needsUpdate = true;
        }
      }
    }
  }

  // Function to update particle tail - red and orange particle tail
  function updateTailParticles() {
    // Add new particle at sphere position (every frame for wide tail)
    const particleColor = tailColors[Math.floor(Math.random() * tailColors.length)]; // Random red or orange
    const particleMaterial = new THREE.MeshStandardMaterial({ 
      color: particleColor,
      transparent: true, 
      opacity: 1.0, // Maximum opacity for visibility
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
    const baseAcceleration = 0.001; // Much slower acceleration // Further reduced base acceleration rate for slower movement
    const verticalAcceleration = 0.0005; // Much slower vertical acceleration // Slower acceleration for vertical movement
    const accelerationMultiplier = 1.03; // Further reduced acceleration multiplier for smoother buildup
    const friction = 0.92; // Even smoother deceleration
    const maxSpeed = 0.08; // Much slower maximum speed // Further reduced maximum movement speed
    const maxVerticalSpeed = 0.02; // Much slower vertical speed // Slower maximum speed for vertical movement
    const maxDeviation = 25; // Increased maximum distance from center position
    const pullbackForce = 0.008; // Stronger pullback force for better return to center
    const verticalPullbackForce = 0.004; // Stronger pullback for vertical movement
    const wobbleStrength = 0.2; // Reduced wobble strength for smoother effect
    
    // Apply boost acceleration when space is held
    const boostMultiplier = keysPressed.space ? 3.0 : 1.0; // 3x acceleration when boosting
    
    // Space button adds forward acceleration (negative Z direction - toward camera)
    // Space button modifies Z velocity (same pattern as A/D)
    if (keysPressed.space) {
      // Progressive acceleration that builds up over time
      const accelerationRate = 0.003 * Math.pow(1 + sphereVelocityZ * 0.1, 0.8);
      sphereVelocityZ += accelerationRate;
      
      // Debug logging
      if (frameCount % 60 === 0) {
        console.log('Space pressed - Z velocity:', sphereVelocityZ.toFixed(4), 'Z offset:', sphereOffsetZ.toFixed(4));
      }
    }
    
    // Apply input forces with accelerating effect (X-axis)
    if (keysPressed.a) {
      // Increase acceleration over time for smooth start
      const currentAcceleration = baseAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityX) * 20) * boostMultiplier;
      sphereVelocityX += currentAcceleration; // A now moves right (was left)
    }
    if (keysPressed.d) {
      // Increase acceleration over time for smooth start
      const currentAcceleration = baseAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityX) * 20) * boostMultiplier;
      sphereVelocityX -= currentAcceleration; // D now moves left (was right)
    }
    
    // Apply input forces with accelerating effect (Y-axis) - SLOWER
    if (keysPressed.w) {
      // Increase acceleration over time for smooth start - SLOWER
      const currentAcceleration = verticalAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityY) * 20) * boostMultiplier;
      sphereVelocityY += currentAcceleration; // W moves up
    }
    if (keysPressed.s) {
      // Increase acceleration over time for smooth start - SLOWER
      const currentAcceleration = verticalAcceleration * Math.pow(accelerationMultiplier, Math.abs(sphereVelocityY) * 20) * boostMultiplier;
      sphereVelocityY -= currentAcceleration; // S moves down
    }
    
    // Apply smooth deceleration when no keys are pressed (X-axis)
    if (!keysPressed.a && !keysPressed.d && !keysPressed.space) {
      // Apply friction for smooth deceleration
      sphereVelocityX *= friction;
      
      // Apply gradual pullback force proportional to distance from center
      const pullbackDirection = -Math.sign(sphereOffsetX); // Direction towards center
      const pullbackStrength = pullbackForce * Math.abs(sphereOffsetX) * 0.3; // Gradual pullback
      sphereVelocityX += pullbackDirection * pullbackStrength;
      
      // Apply stronger pullback force if velocity is low (near stopped)
      if (Math.abs(sphereVelocityX) < 0.002) {
        const strongPullbackStrength = pullbackForce * Math.abs(sphereOffsetX) * 0.7; // Stronger pull when nearly stopped
        sphereVelocityX += pullbackDirection * strongPullbackStrength;
      }
    }
    
    // Apply smooth deceleration when no keys are pressed (Y-axis)
    if (!keysPressed.w && !keysPressed.s) {
      // Apply friction for smooth deceleration
      sphereVelocityY *= friction;
      
      // Apply gradual pullback force proportional to distance from center
      const pullbackDirection = -Math.sign(sphereOffsetY); // Direction towards center
      const pullbackStrength = verticalPullbackForce * Math.abs(sphereOffsetY) * 0.3; // Gradual pullback
      sphereVelocityY += pullbackDirection * pullbackStrength;
      
      // Apply stronger pullback force if velocity is low (near stopped)
      if (Math.abs(sphereVelocityY) < 0.002) {
        const strongPullbackStrength = verticalPullbackForce * Math.abs(sphereOffsetY) * 0.7; // Stronger pull when nearly stopped
        sphereVelocityY += pullbackDirection * strongPullbackStrength;
      }
    }
    
    // Limit maximum speed (X-axis) - higher limits when boosting
    const currentMaxSpeed = keysPressed.space ? maxSpeed * 3.0 : maxSpeed;
    sphereVelocityX = Math.max(-currentMaxSpeed, Math.min(currentMaxSpeed, sphereVelocityX));
    
    // Limit maximum speed (Y-axis) - SLOWER - higher limits when boosting
    const currentMaxVerticalSpeed = keysPressed.space ? maxVerticalSpeed * 3.0 : maxVerticalSpeed;
    sphereVelocityY = Math.max(-currentMaxVerticalSpeed, Math.min(currentMaxVerticalSpeed, sphereVelocityY));
    
    // Apply smooth deceleration when space is not pressed (Z-axis)
    if (!keysPressed.space) {
      // Apply lighter friction for smoother deceleration
      sphereVelocityZ *= 0.96; // Less aggressive friction than X/Y axis
    }
    
    // Limit maximum speed (Z-axis) - significantly higher limits when boosting
    const currentMaxZSpeed = keysPressed.space ? maxSpeed * 15.0 : maxSpeed * 5.0;
    sphereVelocityZ = Math.max(-currentMaxZSpeed, Math.min(currentMaxZSpeed, sphereVelocityZ));
    
    // Update offset (X-axis)
    sphereOffsetX += sphereVelocityX;
    
    // Update offset (Y-axis) 
    sphereOffsetY += sphereVelocityY;
    
    // Update offset (Z-axis)
    const oldZOffset = sphereOffsetZ;
    sphereOffsetZ += sphereVelocityZ;
    
    // Debug Z offset changes
    if (frameCount % 60 === 0 && keysPressed.space) {
      console.log('Z offset:', oldZOffset.toFixed(4), '->', sphereOffsetZ.toFixed(4));
    }
    
    
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
    
    // Enforce maximum deviation from center (Z-axis) - DISABLED for forward movement
    // Remove boundary for Z-axis to allow unlimited forward acceleration
    // if (Math.abs(sphereOffsetZ) > maxDeviation) {
    //   sphereOffsetZ = Math.sign(sphereOffsetZ) * maxDeviation;
    //   sphereVelocityZ = 0; // Stop at boundary
    // }
    
    // Apply smooth Y position without wobbling
    sphere.position.y = originalSphereY + sphereOffsetY;
  }

  // Function to create cluster template
  function createClusterTemplate(getRandom, starColors) {
    const clusterSize = getRandom() * 80 + 40; // Much larger clusters (was 45+15, now 80+40)
    const starCount = Math.floor(getRandom() * 800 + 400); // Much higher base star count for increased density
      
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
        const size = getRandom() * 0.75 + 0.075; // Size variety: 0.075 to 0.825 (doubled from 0.0375 to 0.4125)
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
    
    const starCount = Math.min(cluster.stars.length, 300); // Increased limit from 200 to 300
    const geometry = new THREE.SphereGeometry(0.2, 6, 6); // Lower quality
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
      // Rotation properties - MUCH SLOWER rotation
      rotationSpeed: (Math.random() - 0.5) * 0.000005, // Random rotation speed between -0.00025 and 0.00025 (much slower)
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

    // REMOVED: Force lookup initialization - was causing performance issues

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
    const keyboardControls = createKeyboardControls();

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
    
    // Add point light to the sphere
    const pointLight = new THREE.PointLight(0xffff00, 1.5, 50, 2);
    pointLight.position.copy(sphere.position);
    scene.add(pointLight);
    
    // Add rotation properties to sphere and store point light reference
    sphere.userData = {
      pointLight: pointLight,  // Store reference to point light for updates
      rotationSpeeds: {
        main: 0.005,    // Main sphere rotation speed
        glow: -0.003,   // Glow layer (opposite direction)
        wave: 0.008,    // Wave layer (different speed)
        forceField: 0.002 // Force field visualization (slow rotation)
      },
      rotationAxes: {
        main: new THREE.Vector3(0, 1, 0),     // Y-axis rotation
        glow: new THREE.Vector3(1, 0, 0),    // X-axis rotation
        wave: new THREE.Vector3(0, 0, 1),    // Z-axis rotation
        forceField: new THREE.Vector3(1, 1, 0).normalize() // Diagonal rotation
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

    // Force field visualization sphere
    const forceFieldGeom = new THREE.SphereGeometry(forceFieldRadius, 32, 32); // Radius matches pushRadius
    const forceFieldMat = new THREE.MeshStandardMaterial({
      color: 0x0088aa, // Darker cyan
      transparent: true,
      opacity: 0.25, // Reduced visibility
      wireframe: true,
      emissive: 0x0088aa,
      emissiveIntensity: 0.4 // Reduced brightness
    });
    const forceField = new THREE.Mesh(forceFieldGeom, forceFieldMat);
    forceField.userData = { layerType: 'forceField' };
    sphere.add(forceField);
    
    // Store reference for resizing
    forceFieldMesh = forceField;

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
    
    // console.log(`Created ${clusterPool.length} cluster templates`);

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
            // if (frameCount % 60 === 0) {
            //   console.log(`Spawned cluster ahead at path index ${i}, distance from sphere: ${distToSphere.toFixed(1)}`);
            // }
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
    
    // Simple line trail
    const trailGeom = new THREE.BufferGeometry();
    const maxTrailPoints = 200;
    const positions = new Float32Array(maxTrailPoints * 3);
    const colors = new Float32Array(maxTrailPoints * 3);
    
    trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 5,
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
        keysPressed.space = true; // Enable continuous boost acceleration
        console.log('Space key down detected');
      }
      if (e.code === 'KeyM') {
        physicsMode = physicsMode === 'standard' ? 'chain' : 'standard';
        modeDisplay = physicsMode;
        updateModeDisplay();
        console.log('Physics mode:', physicsMode);
      }
      if (e.code === 'Equal' || e.code === 'NumpadAdd') { // Plus key (+)
        e.preventDefault();
        forceFieldRadius = Math.min(forceFieldRadius + 2, 50); // Increase radius, max 50
        updateForceFieldSize();
      }
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') { // Minus key (-)
        e.preventDefault();
        forceFieldRadius = Math.max(forceFieldRadius - 2, 2); // Decrease radius, min 2
        updateForceFieldSize();
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
        keysPressed.space = false; // Disable boost acceleration
        console.log('Space key up detected');
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
      const acceleration = targetSpeed > speed ? 0.008 : 0.006; // Much slower acceleration
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
      
      // Apply sphere movement controls first to update offsets
      updateSphereMovement();
      
      // Apply offsets to targetPos before setting sphere position
      targetPos.x += sphereOffsetX;
      targetPos.y += sphereOffsetY;
      targetPos.z += sphereOffsetZ; // Apply Z offset for space button movement
      
      sphere.position.copy(targetPos);
      
      // Debug sphere position
      if (frameCount % 60 === 0 && keysPressed.space) {
        console.log('Sphere Z position:', sphere.position.z.toFixed(4));
      }
      
      // Enhanced debug logging for Z-axis system
      if (frameCount % 60 === 0) {
        console.log('Z Debug - velocity:', sphereVelocityZ.toFixed(4), 'offset:', sphereOffsetZ.toFixed(4), 'target Z:', targetPos.z.toFixed(4), 'sphere Z:', sphere.position.z.toFixed(4), 'space:', keysPressed.space);
      }
      
      // Update point light position to follow sphere
      if (sphere.userData.pointLight) {
        sphere.userData.pointLight.position.copy(sphere.position);
      }

      // Store original Y position for wobble effect (only once)
      if (originalSphereY === 0) {
        originalSphereY = sphere.position.y;
      }
      
      
      // Update point light position after manual movement
      if (sphere.userData.pointLight) {
        sphere.userData.pointLight.position.copy(sphere.position);
      }

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
            
            const starCount = Math.max(50, Math.floor(cluster.stars.length * dynamicMultiplier * adaptiveQuality)); // Increased minimum from 30 to 50
            
            // Debug: Log dynamic LOD calculation
            // if (frameCount % 30 === 0) {
            //   console.log(`Dynamic LOD: Distance to sphere: ${distToSphere.toFixed(1)}, Multiplier: ${dynamicMultiplier.toFixed(2)}, Adaptive: ${adaptiveQuality.toFixed(2)}, Final count: ${starCount}/${cluster.stars.length}`);
            // }
            
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
            // if (frameCount % 30 === 0) {
            //   console.log(`Rendered cluster with ${meshesCreated} meshes at distance: ${distToCluster.toFixed(1)}`);
            // }
          } else if (lodLevel >= 1) {
            // Apply fake physics to non-interactive clusters
            applyFakePhysics(cluster, distToCluster);
          }
          
          // OLD PHYSICS DISABLED - Now handled by optimized physics system below
          // This old physics code was interfering with the new optimized system
          
    // Cluster rotation removed - stars now only respond to sphere force field
        }
      });

      // Debug: Log cluster detection every 30 frames
      // if (frameCount % 30 === 0) {
      //   console.log(`Active clusters: ${activeClusters.length}`);
      //   activeClusters.forEach((cluster, i) => {
      //     const dist = cluster.center.distanceTo(sphere.position);
      //     const renderedStars = cluster.stars.filter(star => star.mesh).length;
      //     console.log(`Cluster ${i}: Distance: ${dist.toFixed(1)}, Rendered: ${cluster.rendered}, Stars: ${renderedStars}/${cluster.stars.length}`);
      //   });
      // }
      
      // Find the 2 closest clusters the sphere can interact with (OPTIMIZED)
      let currentClusters = [];
      let clusterDistances = [];
      const maxInteractionDistance = 20;
      const maxInteractionDistanceSquared = maxInteractionDistance * maxInteractionDistance;
      
      for (let i = 0; i < activeClusters.length; i++) {
        const cluster = activeClusters[i];
        const distSquared = cluster.center.distanceToSquared(sphere.position);
        
        // Only consider clusters within interaction range (use squared distance)
        if (distSquared < maxInteractionDistanceSquared) {
          clusterDistances.push({ cluster: cluster, distanceSquared: distSquared });
        }
      }
      
      // Sort by distance and take the 4 closest
      clusterDistances.sort((a, b) => a.distanceSquared - b.distanceSquared);
      currentClusters = clusterDistances.slice(0, 4).map(item => item.cluster);

      // Process physics for up to 4 clusters
      if (currentClusters.length > 0) {
        // Debug: Log physics interaction
        // if (frameCount % 30 === 0) {
        //   console.log(`Physics active on ${currentClusters.length} cluster(s), Mode: ${physicsMode}`);
        //   currentClusters.forEach((cluster, index) => {
        //     const dist = cluster.center.distanceTo(sphere.position);
        //     console.log(`Cluster ${index + 1}: Distance: ${dist.toFixed(1)}, Stars: ${cluster.stars.length}`);
        //   });
        // }
          
        // Update star physics based on mode (MASS-BASED with size categories)
        if (physicsMode === 'standard') {
          // Standard mode - mass-based sphere force field
          let totalStarsProcessed = 0;
          let totalStarsPushed = 0;
          
          currentClusters.forEach(cluster => {
            const pushRadius = forceFieldRadius;
            const pushRadiusSquared = pushRadius * pushRadius;
            
            // Categorize stars by size for optimized processing
            const categorizedStars = categorizeStarsBySize(cluster);
            
            // Process each size category with appropriate mass-based physics
            Object.keys(categorizedStars).forEach(category => {
              const stars = categorizedStars[category];
              const inverseMass = INVERSE_MASSES[category];
              
              stars.forEach(starData => {
                // Use distanceSquared for performance - FIXED: use current position, not original
                const distSquared = starData.position.distanceToSquared(sphere.position);
                
                if (distSquared < pushRadiusSquared) {
                  // Calculate force with mass consideration
                  const dist = Math.sqrt(distSquared);
                  const normalizedDist = Math.max(dist / pushRadius, 0.001); // Smaller minimum for more immediate push response
                  
                  // Calculate sphere's current speed for proportional force
                  const sphereSpeed = Math.sqrt(sphereVelocityX * sphereVelocityX + sphereVelocityY * sphereVelocityY);
                  const speedMultiplier = 1.0 + (sphereSpeed * 10); // Speed affects force (1.0 = base, higher = stronger)
                  
                  const baseForce = Math.pow(1 - normalizedDist, 2) * 2.0 * speedMultiplier; // Speed-proportional force
                  
                  // Apply inverse mass - bigger stars move less!
                  const massAdjustedForce = baseForce * inverseMass;
                  
                  // Cap the maximum force to prevent explosions but allow strong pushes
                  const cappedForce = Math.min(massAdjustedForce, 1.5); // Increased cap for speed-boosted hits
                  
                  const direction = new THREE.Vector3()
                    .subVectors(starData.position, sphere.position)
                    .normalize();
                  
                  starData.velocity.add(direction.multiplyScalar(cappedForce));
                  
                  // Trigger heat effect when star interacts with force field
                  triggerHeatEffect(cappedForce * 0.3); // Heat intensity proportional to force (increased for visibility)
                  
                  // Create hit mark at the exact hit location
                  createHitMark(starData.position, cappedForce * 0.5); // Much more visible hit marks
                  
                  totalStarsPushed++;
                }
                
                // Apply physics updates with reduced damping to preserve momentum
                starData.position.add(starData.velocity);
                // Much less damping to preserve momentum after push
                const dampingFactor = 0.995 + (1 - inverseMass) * 0.002; // Reduced damping to preserve momentum
                starData.velocity.multiplyScalar(dampingFactor);
                
                // Cap velocity to prevent explosions
                const maxVelocity = 2.0; // Maximum velocity per frame
                if (starData.velocity.length() > maxVelocity) {
                  starData.velocity.normalize().multiplyScalar(maxVelocity);
                }
                
                // Update instanced mesh position with physics displacement
                const finalPos = starData.position.clone();
                const matrix = new THREE.Matrix4();
                const scale = starData.size * (shouldUseSprite(finalPos.distanceTo(camera.position)) ? 6 : 1);
                
                matrix.compose(
                  finalPos,
                  new THREE.Quaternion(),
                  new THREE.Vector3(scale, scale, scale)
                );
                
                starData.instancedMesh.setMatrixAt(starData.instancedIndex, matrix);
                starData.instancedMesh.instanceMatrix.needsUpdate = true;
                
                // Much weaker return force to preserve momentum
                const displacementSquared = starData.position.distanceToSquared(starData.originalPos);
                if (displacementSquared > 25.0 && distSquared > pushRadiusSquared * 4.0) { // Increased thresholds
                  const displacement = Math.sqrt(displacementSquared);
                  const returnForce = new THREE.Vector3()
                    .subVectors(starData.originalPos, starData.position)
                    .multiplyScalar(0.0001 * inverseMass); // Much weaker return force
                  starData.velocity.add(returnForce);
                }
                
                totalStarsProcessed++;
              });
            });
          });
          
          // Enhanced debug logging with size categories
          if (frameCount % 60 === 0) {
            console.log(`Physics: ${totalStarsProcessed} stars, ${totalStarsPushed} pushed`);
            
            // Log size category distribution and rotation info
            if (currentClusters.length > 0) {
              const cluster = currentClusters[0];
              const categorizedStars = categorizeStarsBySize(cluster);
              // console.log(`Size categories: Small: ${categorizedStars.SMALL.length}, Medium: ${categorizedStars.MEDIUM.length}, Large: ${categorizedStars.LARGE.length}, Giant: ${categorizedStars.GIANT.length}`);
              // console.log(`Cluster rotation: Speed: ${cluster.rotationSpeed.toFixed(4)}, Angle: ${cluster.rotationAngle.toFixed(2)}`);
            }
          }
        } else {
          // Chain mode - mass-based with size categories
          let totalStarsProcessed = 0;
          let totalStarsPushed = 0;
          
          currentClusters.forEach(cluster => {
            const pushRadius = forceFieldRadius;
            const pushRadiusSquared = pushRadius * pushRadius;
            const interactionRadius = 4;
            const interactionRadiusSquared = interactionRadius * interactionRadius;
            
            // Categorize stars by size
            const categorizedStars = categorizeStarsBySize(cluster);
            
            // Sphere pushes stars (mass-based)
            Object.keys(categorizedStars).forEach(category => {
              const stars = categorizedStars[category];
              const inverseMass = INVERSE_MASSES[category];
              
              stars.forEach(starData => {
                const distSquared = starData.position.distanceToSquared(sphere.position);
                
                if (distSquared < pushRadiusSquared) {
                  const dist = Math.sqrt(distSquared);
                  const normalizedDist = Math.max(dist / pushRadius, 0.001); // Smaller minimum for more immediate push response
                  
                  // Calculate sphere's current speed for proportional force
                  const sphereSpeed = Math.sqrt(sphereVelocityX * sphereVelocityX + sphereVelocityY * sphereVelocityY);
                  const speedMultiplier = 1.0 + (sphereSpeed * 10); // Speed affects force (1.0 = base, higher = stronger)
                  
                  const baseForce = Math.pow(1 - normalizedDist, 2) * 2.0 * speedMultiplier; // Speed-proportional force
                  const massAdjustedForce = baseForce * inverseMass;
                  
                  // Cap the maximum force to prevent explosions but allow strong pushes
                  const cappedForce = Math.min(massAdjustedForce, 1.5); // Increased cap for speed-boosted hits
                  
                  const direction = new THREE.Vector3()
                    .subVectors(starData.position, sphere.position)
                    .normalize();
                  
                  starData.velocity.add(direction.multiplyScalar(cappedForce));
                  
                  // Trigger heat effect when star interacts with force field
                  triggerHeatEffect(cappedForce * 0.3); // Heat intensity proportional to force (increased for visibility)
                  
                  // Create hit mark at the exact hit location
                  createHitMark(starData.position, cappedForce * 0.5); // Much more visible hit marks
                  
                  totalStarsPushed++;
                }
              });
            });
            
            // Mass-based star-to-star interactions
            Object.keys(categorizedStars).forEach(category => {
              const stars = categorizedStars[category];
              const inverseMass = INVERSE_MASSES[category];
              
              stars.forEach((starData, idx) => {
                if (starData.velocity.length() < 0.02) return;
                
                // Check interactions with all other stars
                cluster.stars.forEach((otherStar, otherIdx) => {
                  if (idx === otherIdx || !otherStar.instancedMesh) return;
                  
                  // Early culling
                  const dx = Math.abs(starData.position.x - otherStar.position.x);
                  const dy = Math.abs(starData.position.y - otherStar.position.y);
                  const dz = Math.abs(starData.position.z - otherStar.position.z);
                  
                  if (dx > interactionRadius || dy > interactionRadius || dz > interactionRadius) {
                    return;
                  }
                  
                  const distSquared = starData.position.distanceToSquared(otherStar.position);
                  
                  if (distSquared < interactionRadiusSquared && distSquared > 0.01) {
                    const velocityMagnitude = starData.velocity.length();
                    
                    if (velocityMagnitude > 0.02) {
                      const dist = Math.sqrt(distSquared);
                      const normalizedDist = dist / interactionRadius;
                      const baseForce = Math.pow(1 - normalizedDist, 2) * velocityMagnitude * 0.2;
                      
                      // Mass-based interaction - heavier stars push lighter ones more
                      const otherInverseMass = otherStar.inverseMass || INVERSE_MASSES[otherStar.sizeCategory];
                      const massAdjustedForce = baseForce * (inverseMass / otherInverseMass);
                      
                      const direction = new THREE.Vector3()
                        .subVectors(otherStar.position, starData.position)
                        .normalize();
                      
                      otherStar.velocity.add(direction.multiplyScalar(massAdjustedForce));
                    }
                  }
                });
                
                // Apply physics updates with reduced damping to preserve momentum
                starData.position.add(starData.velocity);
                const dampingFactor = 0.995 + (1 - inverseMass) * 0.002; // Reduced damping to preserve momentum
                starData.velocity.multiplyScalar(dampingFactor);
                
                // Cap velocity to prevent explosions
                const maxVelocity = 2.0; // Maximum velocity per frame
                if (starData.velocity.length() > maxVelocity) {
                  starData.velocity.normalize().multiplyScalar(maxVelocity);
                }
                
                // Update instanced mesh position
                updateInstancedStarPosition(starData);
                
                // Much weaker return force to preserve momentum
                const displacementSquared = starData.position.distanceToSquared(starData.originalPos);
                if (displacementSquared > 25.0) { // Increased threshold
                  const displacement = Math.sqrt(displacementSquared);
                  const returnForce = new THREE.Vector3()
                    .subVectors(starData.originalPos, starData.position)
                    .multiplyScalar(0.0001 * inverseMass); // Much weaker return force
                  starData.velocity.add(returnForce);
                }
                
                totalStarsProcessed++;
              });
            });
          });
          
          // Minimal debug logging
          if (frameCount % 60 === 0) {
            console.log(`Chain mode: ${totalStarsProcessed} stars, ${totalStarsPushed} pushed`);
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
        
        // Bright gradient colors
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
      
      // Update heat effect
      updateHeatEffect();
      
      // Update hit marks
      updateHitMarks();

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
        // console.log(`Performance: Active clusters: ${activeClusters.length}, Rendered: ${renderedClusters}, Active stars: ${activeStars}, Geometry pool: ${geometryPool.length}, Material pool: ${materialPool.length}, Adaptive quality: ${adaptiveQuality.toFixed(2)}, Interacting clusters: ${currentClusters.length}`);
        
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
          updateKeyboardControls(keyboardControls);
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

  function createKeyboardControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'keyboard-controls';
    controlsDiv.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      border: 1px solid #333;
      border-radius: 4px;
      padding: 10px;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 200px;
    `;
    
    controlsDiv.innerHTML = `
      <div style="color: #00ff00; font-weight: bold; margin-bottom: 8px;">KEYBOARD CONTROLS</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffff00;">WASD</span> - Move sphere</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffff00;">SPACE</span> - Boost (hit harder)</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffff00;">M</span> - Toggle physics mode</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffff00;">+/-</span> - Resize force field</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffff00;">Mouse</span> - Orbit camera</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffff00;">Scroll</span> - Zoom camera</div>
      <div style="color: #00ffff; font-size: 10px; margin-top: 8px;">Faster movement = stronger hits!</div>
    `;
    
    document.body.appendChild(controlsDiv);
    return controlsDiv;
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

  function updateKeyboardControls(controlsDiv) {
    // Controls don't need updating, they're static
    // This function exists for compatibility with the animation loop
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
  let baseDensityMultipliers = [3.0, 2.5, 2.0, 1.5, 1.0, 0.6]; // Increased base multipliers for higher density
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
      
      // if (frameCount % 60 === 0) {
      //   console.log(`Performance low (${averageFps.toFixed(1)} FPS), reducing density multipliers`);
      // }
    } else if (performanceRatio > 1.2) {
      // Performance is good, can increase density
      currentDensityMultipliers = currentDensityMultipliers.map((multiplier, index) => 
        Math.min(multiplier * 1.05, baseDensityMultipliers[index]) // Increase by 5%, max to base
      );
      
      // if (frameCount % 60 === 0) {
      //   console.log(`Performance good (${averageFps.toFixed(1)} FPS), increasing density multipliers`);
      // }
    }
    
    // Debug: Log current multipliers
    // if (frameCount % 120 === 0) {
    //   console.log(`Density multipliers: [${currentDensityMultipliers.map(m => m.toFixed(2)).join(', ')}]`);
    // }
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
      new THREE.SphereGeometry(0.2, 8, 6); // For 3D stars, use small sphere
    
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