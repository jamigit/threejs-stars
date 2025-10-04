# Proven Three.js Movement Strategy

## Analysis of This Project's Coordinate System:

Looking at the camera code:
```javascript
const camX = sphere.position.x + radius * Math.sin(phi) * Math.cos(theta);
const camY = sphere.position.y + radius * Math.cos(phi);
const camZ = sphere.position.z + radius * Math.sin(phi) * Math.sin(theta);
camera.position.copy(cameraCurrentPosition);
camera.lookAt(sphere.position);
```

**Key Insights:**
- Camera is positioned relative to sphere using polar coordinates
- Camera always looks AT the sphere (`camera.lookAt(sphere.position)`)
- Camera distance is controlled by `radius` (cameraDistance)

## STRATEGY 1: Path Speed Control (Most Reliable)

Instead of direct position manipulation, speed up the existing path system:

```javascript
// In the animate() function, find the speed control section around line 1043
const acceleration = targetSpeed > speed ? 0.008 : 0.006;
speed += (targetSpeed - speed) * acceleration;

// REPLACE with:
let normalSpeed = 0.04;
let boostedSpeed = 0.12;

if (keysPressed.space) {
  speed = Math.min(speed + 0.01, boostedSpeed); // Accelerate
} else {
  speed = Math.max(speed - 0.005, normalSpeed); // Decelerate
}
```

## STRATEGY 2: Camera-Relative Movement

Move sphere toward/away from camera:

```javascript
sphere.position.copy(targetPos);

// Move toward camera (should be forward visually)
if (keysPressed.space) {
  const cameraToSphere = sphere.position.clone().sub(camera.position).normalize();
  cameraToSphere.multiplyScalar(-0.5); // Negative = toward camera
  sphere.position.add(cameraToSphere);
  
  console.log('Moving toward camera - distance:', sphere.position.distanceTo(camera.position).toFixed(2));
}
```

## STRATEGY 3: Simple Distance-Based Movement

```javascript
sphere.position.copy(targetPos);

if (keysPressed.space) {
  // Move sphere closer to camera (reduce distance)
  const direction = camera.position.clone().sub(sphere.position).normalize();
  direction.multiplyScalar(-0.5); // Negative = toward camera
  sphere.position.add(direction);
}
```

## Strategy 4: Check Current Path Behavior

The path system already moves forward along Z axis. Why is space not working? Let's debug:

```javascript
// Add this debug code to see what's happening to path movement
if (frameCount % 60 === 0) {
  console.log('Path status:');
  console.log('- distanceTraveled:', distanceTraveled.toFixed(2));
  console.log('- speed:', speed.toFixed(4));
  console.log('- sphere.position.z:', sphere.position.z.toFixed(2));
  console.log('- space pressed:', keysPressed.space);
}
```

## Recommended Implementation:

Try Strategy 1 first (path speed control) as it modifies the working system instead of adding complexity.

```javascript
// Find line ~1044: speed += (targetSpeed - speed) * acceleration;
// Replace that acceleration section with:

const acceleration = targetSpeed > speed ? 0.008 : 0.006;
speed += (targetSpeed - speed) * acceleration;

// Override based on space button
if (keysPressed.space) {
  targetSpeed = 0.12; // Double speed
} else {
  targetSpeed = 0.04; // Normal speed
}
```
