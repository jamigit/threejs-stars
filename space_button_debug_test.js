// SPACE BUTTON DEBUG TEST - Try Different Directions
// Add this code temporarily to find the correct direction

sphere.position.copy(targetPos);

// DEBUG: Test different directions to find correct forward movement
if (keysPressed.space) {
  // Uncomment one of these to test:
  
  // Test 1: Negative Z direction (toward camera)
  sphere.position.z -= 0.5;
  console.log('Test 1 - Z decreasing:', sphere.position.z.toFixed(2));
  
  // Test 2: Positive Z direction (away from camera) 
  // sphere.position.z += 0.5;
  // console.log('Test 2 - Z increasing:', sphere.position.z.toFixed(2));
  
  // Test 3: X direction
  // sphere.position.x += 0.5;
  // console.log('Test 3 - X increasing:', sphere.position.x.toFixed(2));
  
  // Test 4: Y direction
  // sphere.position.y += 0.5;
  // console.log('Test 4 - Y increasing:', sphere.position.y.toFixed(2));
}

// Instructions:
// 1. Add this code temporarily after sphere.position.copy(targetPos)
// 2. Hold space and see which direction FEELS like forward movement
// 3. Use the direction that moves away from camera toward the stars
// 4. Remove the other commented tests
// 5. Adjust the value (0.5) for desired speed
