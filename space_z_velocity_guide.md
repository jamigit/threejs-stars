# Space Button Simple Z Velocity Implementation

## Problem with Current System:
- Path speed control causes unexpected behavior (moves backward first)
- Complex Z-axis physics system is buggy
- Too much state management and physics calculations

## Simple Solution:
Add Z velocity directly to the sphere position in the animate loop.

## Implementation:

### 1. Find the animate loop section (around line 1080-1100)
Look for where sphere.position is set:
```javascript
sphere.position.copy(targetPos);
```

### 2. Add space button Z movement right after sphere position is set:

```javascript
sphere.position.copy(targetPos);

// Apply space button Z velocity (ADD THIS)
if (keysPressed.space) {
  sphere.position.z += 0.3; // Move forward (away from camera) - adjust value as needed
  
  // Debug logging
  if (frameCount % 60 === 0) {
    console.log('Space pressed - sphere Z:', sphere.position.z.toFixed(2));
  }
}
```

### 3. Remove ALL the complex Z-axis system:
- Remove sphereOffsetZ and sphereVelocityZ variables (lines 109-110)
- Remove the entire space button section in updateSphereMovement() (lines 232-241)
- Remove all Z-axis physics (friction, limits, boundaries)
- Remove sphereOffsetZ from path system (line 1084)

## Result:
- **Hold space** → Sphere moves forward instantly (away from camera)
- **Release space** → No Z movement (sphere stays at current Z position)
- **Simple** → No physics, no state, just direct position change
- **Predictable** → Always moves in same direction when space held

## Advantages:
1. **No bugs** → No complex physics system to break
2. **Immediate response** → Instant movement when space pressed
3. **Simple debugging** → Just see Z position change
4. **Consistent** → Same behavior every time
5. **Easy to adjust** → Change the `0.3` value to speed up/slow down

## Values to Try:
- `0.1` = Slow movement
- `0.3` = Medium movement (recommended)
- `0.5` = Quick movement
- `1.0` = Very fast movement