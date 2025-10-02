// Three.js Stars - Vanilla JavaScript Version
(function() {
  // Variables to store references
  let scene, camera, renderer, sphere;
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
  let activeClusters = []; // Only 3-4 clusters active at once (reduced for better performance)
  let maxActiveClusters = 4;
  let currentClusterIndex = 0; // Index of cluster sphere is currently interacting with
  let clusterPool = []; // Pool of pre-created cluster data
  let frameCount = 0;
  
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

  // Function to create cluster template
  function createClusterTemplate(getRandom, starColors) {
    const clusterSize = getRandom() * 45 + 15;
    const starCount = Math.floor(getRandom() * 200 + 100); // Reduced from 700+500 to 200+100
    
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
      const size = getRandom() * 0.15 + 0.05;
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
    const material = new THREE.MeshBasicMaterial();
    
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
    const mat = new THREE.MeshBasicMaterial({ color: color });
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
      id: Math.random()
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

  // Pre-calculate trail colors for better performance
  const preCalculatedTrailColors = [];
  for (let i = 0; i < 200; i++) {
    const t = i / 200;
    const color = new THREE.Color();
    if (t < 0.5) {
      color.setHSL(0.5 + t * 0.3, 1.0, 0.7);
    } else {
      color.setHSL(0.65 + (t - 0.5) * 0.3, 1.0, 0.7);
    }
    preCalculatedTrailColors.push(color);
  }

  // Initialize the scene
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
    scene.background = new THREE.Color(0x000510);

    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 18);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas').appendChild(renderer.domElement);

    // Create glowing sphere
    const sphereGeom = new THREE.SphereGeometry(0.8, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9
    });
    sphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(sphere);

    // Sphere glow
    const glowGeom = new THREE.SphereGeometry(1.2, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    sphere.add(glow);

    // Push wave
    const waveGeom = new THREE.SphereGeometry(2, 32, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.1,
      wireframe: true
    });
    const wave = new THREE.Mesh(waveGeom, waveMat);
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
    const starColors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0088, 0x00ff88];
    
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
      const clusterSpacing = 8; // Space between clusters (reduced from 15 for visibility)
      const lookAhead = 12; // Show clusters this many steps ahead (increased for visibility)
      const lookBehind = 3; // Show clusters this many steps behind (increased for visibility)
      
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
          // Check if cluster already exists at this position (reduced minimum distance for visibility)
          const exists = activeClusters.some(cluster => 
            cluster.center.distanceTo(pathPos) < 25
          );
          
          if (!exists) {
            // Create offset from path (reduced range for better visibility)
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
      linewidth: 8,
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
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        targetSpeed = 0.12;
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
          
          // Render this cluster if not already rendered (OPTIMIZED: LOD + Object pooling + Adaptive quality)
          if (!cluster.rendered) {
            const starCount = Math.max(10, Math.floor(cluster.stars.length * lodMultipliers[lodLevel] * adaptiveQuality)); // Ensure minimum 10 stars
            
            // Debug: Log LOD calculation
            if (frameCount % 30 === 0) {
              console.log(`LOD: Distance: ${distToCluster.toFixed(1)}, Level: ${lodLevel}, Multiplier: ${lodMultipliers[lodLevel]}, Adaptive: ${adaptiveQuality.toFixed(2)}, Final count: ${starCount}/${cluster.stars.length}`);
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
            
            // Regular rendering with LOD + Object pooling (RE-ENABLED)
            let meshesCreated = 0;
            for (let i = 0; i < starCount; i++) {
              const starData = cluster.stars[i];
              const starGeom = getGeometry(starData.size); // Re-enable object pooling
              const starMat = getMaterial(starData.color); // Re-enable object pooling
              const mesh = new THREE.Mesh(starGeom, starMat);
              mesh.position.copy(starData.position);
              scene.add(mesh);
              starData.mesh = mesh;
              meshesCreated++;
            }
            cluster.rendered = true;
            
            // Debug: Log cluster rendering
            if (frameCount % 30 === 0) {
              console.log(`Rendered cluster with ${meshesCreated} meshes at distance: ${distToCluster.toFixed(1)}`);
            }
          } else if (lodLevel >= 1) {
            // Apply fake physics to non-interactive clusters
            applyFakePhysics(cluster, distToCluster);
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
      
      // Find the cluster the sphere is currently interacting with (OPTIMIZED: Early exit + Exclusive interaction)
      let currentCluster = null;
      let minDist = Infinity;
      
      for (let i = 0; i < activeClusters.length; i++) {
        const cluster = activeClusters[i];
        const dist = cluster.center.distanceTo(sphere.position);
        
        // Only consider clusters within interaction range (balanced for visibility and interaction)
        if (dist < 20 && dist < minDist) {
          minDist = dist;
          currentCluster = cluster;
          if (dist < 12) break; // Early exit if very close (balanced threshold)
        }
      }

      // Only process the current cluster for physics
      if (currentCluster) {
        // Debug: Log physics interaction
        if (frameCount % 30 === 0) {
          console.log(`Physics active on cluster at distance: ${minDist.toFixed(1)}, Stars: ${currentCluster.stars.length}, Mode: ${physicsMode}`);
        }
          
        // Update star physics based on mode (ONLY for current cluster - OPTIMIZED)
        if (physicsMode === 'standard') {
            // Standard mode - only sphere pushes stars (OPTIMIZED: Only process nearby stars)
          let starsProcessed = 0;
          let starsPushed = 0;
          
          currentCluster.stars.forEach(starData => {
              if (!starData.mesh) return;
              
              const dist = starData.mesh.position.distanceTo(sphere.position);
              const pushRadius = 12; // Increased push radius for better interaction
              
              // Only process stars within interaction range for better performance
              if (dist < pushRadius * 2) { // Process stars within 2x push radius
                starsProcessed++;
              
              if (dist < pushRadius) {
                  const force = (1 - dist / pushRadius) * 0.8; // Increased force for more noticeable interaction
                const direction = new THREE.Vector3()
                  .subVectors(starData.mesh.position, sphere.position)
                  .normalize();
                
                starData.velocity.add(direction.multiplyScalar(force));
                  starsPushed++;
                  
                  // Debug: Log when stars are being pushed
                  if (frameCount % 30 === 0 && force > 0.1) {
                    console.log(`Pushing star! Force: ${force.toFixed(3)}, Distance: ${dist.toFixed(1)}`);
                  }
                }
                
                // Apply physics only to nearby stars
              starData.mesh.position.add(starData.velocity);
                starData.velocity.multiplyScalar(0.98); // Reduced damping for more visible movement
              
              const returnForce = new THREE.Vector3()
                .subVectors(starData.originalPos, starData.mesh.position)
                  .multiplyScalar(0.01); // Reduced return force for more dramatic movement
              starData.velocity.add(returnForce);
              }
            });
            
            // Debug: Log physics processing
            if (frameCount % 30 === 0) {
              console.log(`Physics processed: ${starsProcessed} nearby stars, ${starsPushed} pushed`);
            }
          } else {
          // Chain mode - stars push each other (OPTIMIZED: Only in current cluster)
          currentCluster.stars.forEach(starData => {
              if (!starData.mesh) return;
              
              // Sphere pushes stars
              const dist = starData.mesh.position.distanceTo(sphere.position);
              const pushRadius = 12; // Increased push radius for better interaction
              
              if (dist < pushRadius) {
                const force = (1 - dist / pushRadius) * 0.8; // Increased force for more noticeable interaction
                const direction = new THREE.Vector3()
                  .subVectors(starData.mesh.position, sphere.position)
                  .normalize();
                
                starData.velocity.add(direction.multiplyScalar(force));
              }
            });
            
          // Stars push each other (OPTIMIZED: Only check moving stars and nearby stars)
          currentCluster.stars.forEach((starData, idx) => {
              if (!starData.mesh) return;
              
            // Skip static stars to reduce collision checks
            if (starData.velocity.length() < 0.05) return;
            
            currentCluster.stars.forEach((otherStar, otherIdx) => {
                if (idx === otherIdx || !otherStar.mesh) return;
              
              // Spatial partitioning: Quick distance check using bounding box
              const dx = Math.abs(starData.mesh.position.x - otherStar.mesh.position.x);
              const dy = Math.abs(starData.mesh.position.y - otherStar.mesh.position.y);
              const dz = Math.abs(starData.mesh.position.z - otherStar.mesh.position.z);
              
              if (dx > 3 || dy > 3 || dz > 3) return; // Skip if too far
                
                const dist = starData.mesh.position.distanceTo(otherStar.mesh.position);
                const interactionRadius = 3;
                
                if (dist < interactionRadius && dist > 0.1) {
                  const velocityMagnitude = starData.velocity.length();
                  
                  if (velocityMagnitude > 0.05) {
                    const force = (1 - dist / interactionRadius) * velocityMagnitude * 0.15;
                    const direction = new THREE.Vector3()
                      .subVectors(otherStar.mesh.position, starData.mesh.position)
                      .normalize();
                    
                    otherStar.velocity.add(direction.multiplyScalar(force));
                  }
                }
              });
            });
            
            // Apply velocity and damping
          currentCluster.stars.forEach(starData => {
              if (!starData.mesh) return;
              
              starData.mesh.position.add(starData.velocity);
              starData.velocity.multiplyScalar(0.98); // Reduced damping for more visible movement
              
              const returnForce = new THREE.Vector3()
                .subVectors(starData.originalPos, starData.mesh.position)
                .multiplyScalar(0.01); // Reduced return force for more dramatic movement
              starData.velocity.add(returnForce);
            });
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
      
      camera.position.set(camX, camY, camZ);
      camera.lookAt(sphere.position);

      // Update adaptive quality based on frame rate
      updateAdaptiveQuality();

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
        console.log(`Performance: Active clusters: ${activeClusters.length}, Rendered: ${renderedClusters}, Active stars: ${activeStars}, Geometry pool: ${geometryPool.length}, Material pool: ${materialPool.length}, Adaptive quality: ${adaptiveQuality.toFixed(2)}, Current cluster: ${currentCluster ? `Yes (dist: ${minDist.toFixed(1)})` : 'No'}`);
      }

      renderer.render(scene, camera);
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

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();