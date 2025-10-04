// SIMPLE SPACE BUTTON Z VELOCITY IMPLEMENTATION
// Replace the complex space button logic with simple temporary Z velocity

// REPLACE THE ENTIRE SPACE BUTTON SECTION (lines 232-241) WITH THIS SIMPLE VERSION:

// Space button adds simple forward movement (away from camera)
if (keysPressed.space) {
  sphere.position.z += 0.3; // Move forward (away from camera) - positive Z direction
  
  // Debug logging
  if (frameCount % 60 === 0) {
    console.log('Space pressed - sphere Z position:', sphere.position.z.toFixed(2));
  }
}

// OR ADD THIS DIRECTLY IN THE ANIMATE LOOP after sphere.position.copy(targetPos):

/*
// Apply space button Z velocity (ADD THIS)
if (keysPressed.space) {
  sphere.position.z += 0.3; // Move forward (away from camera)
  
  // Debug logging
  if (frameCount % 60 === 0) {
    console.log('Space pressed - sphere Z:', sphere.position.z.toFixed(2));
  }
}
*/

// REMOVE ALL Z-AXIS PHYSICS VARIABLES AND SYSTEMS:
// - Remove sphereOffsetZ and sphereVelocityZ variables
// - Remove all Z-axis friction, limits, boundaries
// - Remove sphereOffsetZ from path system
// - Keep existing WASD movement system as-is

// This approach:
// 1. Directly modifies sphere.position.z += when space is held
// 2. No complex physics or state management
// 3. Simple and predictable behavior
// 4. Space = move forward (away from camera), no space = no movement

// CHANGED FROM -= TO +=:
// -= moves toward camera (backward)
// += moves away from camera (forward) - this is what we want!