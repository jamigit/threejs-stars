// STRATEGY 1: Path Speed Control Implementation

// STEP 1: Find line ~1044 where speed is calculated:
// const acceleration = targetSpeed > speed ? 0.008 : 0.006;
// speed += (targetSpeed - speed) * acceleration;

// STEP 2: Add right after the speed calculation (around line 1044):

speed += (targetSpeed - speed) * acceleration;

// ADD THIS: Space button controls path speed
if (keysPressed.space) {
  // Boost target speed when space is held
  targetSpeed = 0.12; // Triple speed (was 0.04)
} else {
  // Normal target speed when space is not held
  targetSpeed = 0.04; // Normal speed
}

// Debug logging
if (frameCount % 60 === 0 && keysPressed.space) {
  console.log('Space button - speed:', speed.toFixed(4), 'target:', targetSpeed.toFixed(4));
}

// STEP 3: Remove any existing complex space button code from updateSphereMovement()
// Don't modify sphere.position.z directly anymore

// Result:
// - Hold space → Sphere moves 3x faster along existing path
// - Release space → Smooth deceleration back to normal speed
// - Uses existing path system (no coordinate confusion)
// - Same movement direction as normal (forward along path)
