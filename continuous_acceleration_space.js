// CONTINUOUS SPACE BUTTON ACCELERATION IMPLEMENTATION
// Space button provides continuous acceleration while held, not fixed movement

// Add these variables at the top with other variables (around line 109):
let spaceAcceleration = 0; // Current space acceleration
let maxSpaceSpeed = 2.0; // Maximum speed when space is held

// Replace the simple space button code in the animate loop with this:

sphere.position.copy(targetPos);

// ADD THIS: Continuous space button acceleration
if (keysPressed.space) {
  // Gradually increase acceleration while space is held
  spaceAcceleration = Math.min(spaceAcceleration + 0.05, maxSpaceSpeed);
} else {
  // Gradually decrease acceleration when space is released
  spaceAcceleration = Math.max(spaceAcceleration - 0.02, 0);
}

// Apply current acceleration to sphere Z position
if (spaceAcceleration > 0) {
  sphere.position.z += spaceAcceleration; // Move forward (away from camera)
  
  // Debug logging
  if (frameCount % 60 === 0) {
    console.log('Space acceleration:', spaceAcceleration.toFixed(2), 'Z position:', sphere.position.z.toFixed(2));
  }
}

// Alternative: Force-based acceleration (more realistic)
/*
if (keysPressed.space) {
  // Gradually increase acceleration while space is held
  spaceAcceleration = Math.min(spaceAcceleration + 0.1, maxSpaceSpeed);
} else {
  // Gradually decrease acceleration when space is released (friction)
  spaceAcceleration = Math.max(spaceAcceleration - 0.05, 0);
}

// Apply current acceleration to sphere Z position
if (spaceAcceleration > 0) {
  sphere.position.z += spaceAcceleration; // Move forward (away from camera)
}
*/
