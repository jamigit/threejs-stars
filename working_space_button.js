// WORKING SPACE BUTTON IMPLEMENTATION
// Add this code directly after line 1086: sphere.position.copy(targetPos);

// Replace or add this code:

sphere.position.copy(targetPos);

// ADD THIS: Simple space button Z movement
if (keysPressed.space) {
  sphere.position.z += 0.5; // Move forward (away from camera)
  
  // Debug logging
  console.log('Space pressed - sphere Z position:', sphere.position.z.toFixed(2));
}

// REMOVE ALL THE COMPLEX Z-AXIS SYSTEM:
// 1. Remove lines 232-241 (the entire space button section in updateSphereMovement)
// 2. Remove sphereOffsetZ and sphereVelocityZ variables
// 3. Remove Z-axis physics, friction, limits, boundaries
// 4. Remove sphereOffsetZ from path system

// This simple approach:
// - Directly changes sphere.position.z when space is held
// - No complex physics or state variables
// - Works immediately and predictably
// - Easy to debug with console.log

// To test:
// 1. Add the code above after sphere.position.copy(targetPos)
// 2. Remove the complex Z-axis system
// 3. Hold space - you should see Z position increasing in console
// 4. Release space - Z position stops changing
