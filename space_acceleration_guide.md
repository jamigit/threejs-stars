# Space Button Continuous Acceleration Guide

## Problem:
Space button currently gives fixed movement per frame, but you want **continuous acceleration** (faster and faster the longer it's held).

## Solution:
Add acceleration variables and gradually increase movement speed the longer space is held.

## Step 1: Add Variables
Add these variables near the top with other global variables (around line 109):

```javascript
let spaceAcceleration = 0; // Current space acceleration
let maxSpaceSpeed = 2.0; // Maximum speed when space is held
let spaceAccelRate = 0.05; // How fast acceleration builds up
let spaceDecelRate = 0.02; // How fast acceleration decreases when released
```

## Step 2: Replace Space Button Code
Replace your current space button code in the animate loop with this:

```javascript
sphere.position.copy(targetPos);

// Continuous space button acceleration
if (keysPressed.space) {
  // Gradually increase acceleration while space is held
  spaceAcceleration = Math.min(spaceAcceleration + spaceAccelRate, maxSpaceSpeed);
} else {
  // Gradually decrease acceleration when space is released
  spaceAcceleration = Math.max(spaceAcceleration - spaceDecelRate, 0);
}

// Apply current acceleration to sphere Z position
if (spaceAcceleration > 0) {
  sphere.position.z += spaceAcceleration; // Move forward (away from camera)
  
  // Debug logging
  if (frameCount % 60 === 0) {
    console.log('Space acceleration:', spaceAcceleration.toFixed(2), 'Z position:', sphere.position.z.toFixed(2));
  }
}
```

## How It Works:

### Hold Space Button:
- **Acceleration starts at 0**
- **Gradually increases** by `spaceAccelRate` each frame
- **Caps at `maxSpaceSpeed`** to prevent excessive speed
- **Sphere moves faster** the longer space is held

### Release Space Button:
- **Acceleration gradually decreases** by `spaceDecelRate` each frame
- **Falls to 0** when fully released
- **Smooth deceleration** instead of instant stop

## Adjustable Values:

### Speed/Timing:
- `spaceAccelRate = 0.05` → Fast acceleration buildup
- `spaceAccelRate = 0.02` → Slower acceleration buildup
- `spaceDecelRate = 0.02` → Fast deceleration
- `spaceDecelRate = 0.05` → Slower deceleration

### Maximum Speed:
- `maxSpaceSpeed = 1.0` → Slow maximum speed
- `maxSpaceSpeed = 2.0` → Medium maximum speed
- `maxSpaceSpeed = 5.0` → Fast maximum speed

## Expected Behavior:
1. **Press space** → Acceleration starts building
2. **Hold space** → Gradually gets faster and faster
3. **Release space** → Gradually slows down to stop
4. **Hold again** → Acceleration builds from current level

## Testing:
- Hold space for 2 seconds → Should gradually accelerate
- Release space → Should gradually slow down
- Hold space again → Should continue from where it left off
- Console should show increasing acceleration values
