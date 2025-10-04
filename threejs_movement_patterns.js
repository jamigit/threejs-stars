// THREE.JS MOVEMENT PATTERNS - Common Strategies from Working Projects

// PATTERN 1: Camera-Relative Movement (Most Reliable)
// Move relative to camera's forward direction
function getCameraForwardVector() {
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  return cameraDirection;
}

// Space button moves in camera's forward direction
if (keysPressed.space) {
  const forward = getCameraForwardVector();
  forward.multiplyScalar(0.5); // Move speed
  sphere.position.add(forward);
}

// PATTERN 2: Direct Position Manipulation (Simplest)
// Move sphere along specific axis relative to world
if (keysPressed.space) {
  // CRUCIAL: In Three.js, -Z typically moves toward camera, +Z away from camera
  // But camera positioning changes this! Let's use camera math:
  
  const camZ = sphere.position.z + cameraDistance * Math.sin(phi) * Math.sin(theta);
  
  // Move sphere toward camera (should be forward movement visually)
  sphere.position.z -= cameraDistance * 0.01;
}

// PATTERN 3: Transforms and LookAt (Professional Approach)
if (keysPressed.space) {
  // Create a forward vector from sphere toward camera
  const forwardVector = camera.position.clone().sub(sphere.position).normalize();
  forwardVector.multiplyScalar(0.5);
  sphere.position.add(forwardVector);
}

// PATTERN 4: Use Existing Path System (Recommended)
// Since the path already moves forward correctly, modify the path speed
if (keysPressed.space) {
  // Speed up the existing path movement instead of direct position change
  speed = Math.min(speed + 0.01, 0.15); // Accelerate path movement
} else {
  speed = Math.max(speed - 0.005, 0.04); // Decelerate to normal
}
