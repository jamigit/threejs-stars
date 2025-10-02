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

    // Pre-create all clusters along the path using seed with variety
    const starColors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0088, 0x00ff88];
    
    let i = 2;
    while (i < pathPoints.length) {
      const pathPos = pathPoints[i];
      
      // Randomize offset distance from path
      const offsetDistance = getRandom() * 25 + 10;
      const offset = new THREE.Vector3(
        (getRandom() - 0.5) * offsetDistance,
        (getRandom() - 0.5) * offsetDistance * 0.8,
        (getRandom() - 0.5) * offsetDistance * 0.6
      );
      
      // Randomize cluster size (spread of stars)
      const clusterSize = getRandom() * 45 + 15;
      
      // Randomize star density
      const starCount = Math.floor(getRandom() * 700 + 500);
      
      const cluster = {
        center: pathPos.clone().add(offset),
        stars: [],
        rendered: false,
        id: Math.random()
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
          position: cluster.center.clone().add(starOffset),
          originalPos: null,
          size: size,
          color: color,
          velocity: new THREE.Vector3(),
          mesh: null
        };
        starData.originalPos = starData.position.clone();
        
        cluster.stars.push(starData);
      }
      
      starClusters.push(cluster);
      
      // Randomize spacing to next cluster with maximum cap
      const spacing = Math.floor(getRandom() * 4 + 3);
      i += spacing;
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
      
      // Calculate total path length
      let totalPathLength = 0;
      for (let i = 0; i < pathPoints.length - 1; i++) {
        totalPathLength += pathPoints[i].distanceTo(pathPoints[i + 1]);
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

      // Manage cluster rendering based on distance
      starClusters.forEach(cluster => {
        const distToCluster = cluster.center.distanceTo(sphere.position);
        
        if (distToCluster < renderDistance) {
          // Render this cluster if not already rendered
          if (!cluster.rendered) {
            cluster.stars.forEach(starData => {
              const starGeom = new THREE.SphereGeometry(starData.size, 8, 8);
              const starMat = new THREE.MeshBasicMaterial({ color: starData.color });
              const mesh = new THREE.Mesh(starGeom, starMat);
              mesh.position.copy(starData.position);
              scene.add(mesh);
              starData.mesh = mesh;
            });
            cluster.rendered = true;
          }
          
          // Update star physics based on mode
          if (physicsMode === 'standard') {
            // Standard mode - only sphere pushes stars
            cluster.stars.forEach(starData => {
              if (!starData.mesh) return;
              
              const dist = starData.mesh.position.distanceTo(sphere.position);
              const pushRadius = 8;
              
              if (dist < pushRadius) {
                const force = (1 - dist / pushRadius) * 0.3;
                const direction = new THREE.Vector3()
                  .subVectors(starData.mesh.position, sphere.position)
                  .normalize();
                
                starData.velocity.add(direction.multiplyScalar(force));
              }
              
              starData.mesh.position.add(starData.velocity);
              starData.velocity.multiplyScalar(0.95);
              
              const returnForce = new THREE.Vector3()
                .subVectors(starData.originalPos, starData.mesh.position)
                .multiplyScalar(0.02);
              starData.velocity.add(returnForce);
            });
          } else {
            // Chain mode - stars push each other
            cluster.stars.forEach(starData => {
              if (!starData.mesh) return;
              
              // Sphere pushes stars
              const dist = starData.mesh.position.distanceTo(sphere.position);
              const pushRadius = 8;
              
              if (dist < pushRadius) {
                const force = (1 - dist / pushRadius) * 0.3;
                const direction = new THREE.Vector3()
                  .subVectors(starData.mesh.position, sphere.position)
                  .normalize();
                
                starData.velocity.add(direction.multiplyScalar(force));
              }
            });
            
            // Stars push each other
            cluster.stars.forEach((starData, idx) => {
              if (!starData.mesh) return;
              
              cluster.stars.forEach((otherStar, otherIdx) => {
                if (idx === otherIdx || !otherStar.mesh) return;
                
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
            cluster.stars.forEach(starData => {
              if (!starData.mesh) return;
              
              starData.mesh.position.add(starData.velocity);
              starData.velocity.multiplyScalar(0.95);
              
              const returnForce = new THREE.Vector3()
                .subVectors(starData.originalPos, starData.mesh.position)
                .multiplyScalar(0.02);
              starData.velocity.add(returnForce);
            });
          }
        } else {
          // Remove this cluster if it's rendered but now too far
          if (cluster.rendered) {
            cluster.stars.forEach(starData => {
              if (starData.mesh) {
                scene.remove(starData.mesh);
                starData.mesh.geometry.dispose();
                starData.mesh.material.dispose();
                starData.mesh = null;
              }
            });
            cluster.rendered = false;
          }
        }
      });

      // Update trail - add new position
      trailPoints.unshift(sphere.position.clone());
      if (trailPoints.length > maxTrailPoints) {
        trailPoints.pop();
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
        const t = i / trailPoints.length;
        const color = new THREE.Color();
        // Cyan to magenta to yellow gradient
        if (t < 0.5) {
          color.setHSL(0.5 + t * 0.3, 1.0, 0.7);
        } else {
          color.setHSL(0.65 + (t - 0.5) * 0.3, 1.0, 0.7);
        }
        
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