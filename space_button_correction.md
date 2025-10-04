# Space Button Direction Correction

## Problem:
Space button is moving user backwards instead of forward, even with `sphere.position.z += value`

## Issue Analysis:
Looking at previous debug logs:
- Initial Z position: ~44.6
- With `sphere.position.z += 0.5`: Z increases to 45.1, 45.6, etc.
- Path system: Increases Z (z += 15) each segment
- Camera position: `cameraDistance = 35` (from sphere)

## Possible Issues:

### 1. Camera Direction
The camera might be positioned differently than expected. Check camera positioning code.

### 2. Z Direction Confusion
In Three.js coordinate system:
- **Positive Z** might actually move toward camera (backward)
- **Negative Z** might move away from camera (forward)

## Solution: Test Both Directions

### Option 1: Try Negative Z
Change back to `-=` instead of `+=`:

```javascript
sphere.position.copy(targetPos);

// Test: Move toward camera (negative Z)
if (keysPressed.space) {
  sphere.position.z -= 0.5; // Move toward camera
  
  // Debug logging
  console.log('Space pressed - sphere Z:', sphere.position.z.toFixed(2));
}
```

### Option 2: Try X Direction Instead
Maybe the issue is with Z direction entirely:

```javascript
sphere.position.copy(targetPos);

// Test: Move along X axis
if (keysPressed.space) {
  sphere.position.x += 0.5; // Move along X axis
  
  // Debug logging
  console.log('Space pressed - sphere X:', sphere.position.x.toFixed(2));
}
```

### Option 3: Check Camera Direction
Check where the camera is positioned relative to the sphere:

```javascript
sphere.position.copy(targetPos);

// Debug camera-sphere relationship
if (frameCount % 60 === 0 && keysPressed.space) {
  console.log('Sphere position:', sphere.position.x.toFixed(2), sphere.position.y.toFixed(2), sphere.position.z.toFixed(2));
  console.log('Camera distance:', cameraDistance);
  console.log('Camera angle:', cameraAngle.theta, cameraAngle.phi);
}
```

## Testing Strategy:
1. First try `-=` (negative Z direction)
2. If still backwards, try X direction instead
3. Use debug logs to see actual position changes
4. Test if camera positioning is causing the issue

## Quick Test Implementation:
```javascript
sphere.position.copy(targetPos);

// Test multiple directions to find correct one
if (keysPressed.space) {
  sphere.position.z -= 0.5; // Test negative Z first
  
  console.log('Space pressed - sphere Z:', sphere.position.z.toFixed(2));
}
```

The issue might be that the coordinate system works differently than expected, or the camera positioning makes Z increases appear as backwards movement.
