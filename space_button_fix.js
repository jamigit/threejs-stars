// Space Button Path Speed Control Implementation
// Replace the Z-axis movement system with simple path speed control

// STEP 1: Remove Z-axis variables from lines 109-110
// REMOVE:
// let sphereOffsetZ = 0; // Current Z offset from original position
// let sphereVelocityZ = 0; // Z velocity for smooth movement

// STEP 2: Replace space button logic in updateSphereMovement() function (lines 232-241)
// REPLACE THIS:
/*
// Space button adds forward acceleration (negative Z direction - toward camera)
if (keysPressed.space) {
  const oldZVel = sphereVelocityZ;
  sphereVelocityZ -= 0.01; // Forward acceleration (negative Z)
  
  // Debug logging
  if (frameCount % 60 === 0) {
    console.log('Space pressed - Z velocity:', oldZVel.toFixed(4), '->', sphereVelocityZ.toFixed(4));
  }
}
*/

// WITH THIS:
// Space button increases path movement speed
if (keysPressed.space) {
  targetSpeed = 0.08; // Faster speed when space is held (was 0.04)
  
  // Debug logging
  if (frameCount % 60 === 0) {
    console.log('Space pressed - target speed:', targetSpeed.toFixed(4), 'current speed:', speed.toFixed(4));
  }
} else {
  targetSpeed = 0.04; // Normal speed when space is not held
}

// STEP 3: Remove Z-axis physics from updateSphereMovement() function
// REMOVE THESE SECTIONS:

// Remove Z-axis friction (lines 303-306):
/*
if (!keysPressed.space) {
  sphereVelocityZ *= friction;
}
*/

// Remove Z-axis speed limits (lines 308-311):
/*
const currentMaxZSpeed = keysPressed.space ? maxSpeed * 3.0 : maxSpeed;
sphereVelocityZ = Math.max(-currentMaxZSpeed, Math.min(currentMaxZSpeed, sphereVelocityZ));
*/

// Remove Z-axis offset updates (lines 318-331):
/*
// Update offset (Z-axis)
const oldZOffset = sphereOffsetZ;
sphereOffsetZ += sphereVelocityZ;

// Debug Z offset changes
if (frameCount % 60 === 0 && keysPressed.space) {
  console.log('Z offset:', oldZOffset.toFixed(4), '->', sphereOffsetZ.toFixed(4));
}
*/

// Remove Z-axis boundary limits (lines 334-338):
/*
// Enforce maximum deviation from center (Z-axis)
if (Math.abs(sphereOffsetZ) > maxDeviation) {
  sphereOffsetZ = Math.sign(sphereOffsetZ) * maxDeviation;
  sphereVelocityZ = 0; // Stop at boundary
}
*/

// STEP 4: Remove Z-axis from path system (line 1084)
// REMOVE:
// targetPos.z += sphereOffsetZ; // Apply Z offset for space button movement

// STEP 5: Update debug logging in animate() function (lines 1089-1091)
// REPLACE:
/*
if (frameCount % 60 === 0 && keysPressed.space) {
  console.log('Sphere Z position:', sphere.position.z.toFixed(4));
}
*/

// WITH:
/*
if (frameCount % 60 === 0 && keysPressed.space) {
  console.log('Sphere moving along path - speed:', speed.toFixed(4), 'target:', targetSpeed.toFixed(4));
}
*/
