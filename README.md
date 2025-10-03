# Three.js Stars - Interactive 3D Space Experience

A mesmerizing interactive 3D space exploration experience created with Three.js. Navigate through dynamic star clusters, interact with physics-based star systems, and experience smooth camera controls in an immersive cosmic environment.

## 🌟 Experience Overview

This is an interactive 3D space simulation where you control a glowing yellow sphere that travels through procedurally generated star clusters. The experience combines real-time physics, dynamic lighting, and smooth camera controls to create an engaging cosmic journey.

### Core Experience
- **Space Navigation**: Control a glowing sphere through an infinite starfield
- **Physics Interaction**: Push and interact with thousands of individual stars
- **Dynamic Clusters**: Encounter procedurally generated star clusters with varied colors and sizes
- **Smooth Movement**: Frame-rate independent movement with realistic physics
- **Immersive Camera**: Orbital camera system with mouse and keyboard controls

## 🎮 Controls & Interaction

### Movement Controls
- **WASD Keys**: Manual sphere movement (W=up, S=down, A=right, D=left)
- **Spacebar**: Hold for boost speed (1.0x vs normal 0.12x)
- **Mouse Drag**: Orbit camera around the sphere
- **Mouse Wheel**: Zoom in/out (5-40 units distance)

### Physics Modes
- **M Key**: Toggle between physics modes
  - **Standard Mode**: Direct sphere-to-star interaction
  - **Chain Mode**: Stars interact with each other, creating chain reactions

### Visual Features
- **Dynamic Skybox**: Procedurally generated starfield background
- **Particle Trail**: Red/orange particle trail following the sphere
- **Point Lighting**: Dynamic lighting system with emissive materials
- **Performance Monitoring**: Real-time FPS counter and performance graph

## 🔧 Technical Features

### Performance Optimizations
- **Level of Detail (LOD)**: Dynamic star density based on distance
- **Object Pooling**: Efficient memory management for particles and geometries
- **Instanced Rendering**: Optimized rendering for large star counts
- **Adaptive Quality**: Automatic quality adjustment based on frame rate
- **Spatial Partitioning**: Efficient cluster management and culling

### Physics System
- **Realistic Forces**: Push forces, damping, and return mechanics
- **Multi-Cluster Interaction**: Sphere can affect up to 2 clusters simultaneously
- **Chain Reactions**: Stars can influence nearby stars in chain mode
- **Smooth Deceleration**: Natural physics-based movement with pullback forces

### Rendering System
- **Hybrid 3D/2D**: 3D spheres for close stars, 2D sprites for distant ones
- **Dynamic Materials**: Emissive materials with proper lighting
- **Irregular Star Shapes**: Procedurally generated star sprites with variety
- **Color Variety**: Multiple star colors matching cluster themes

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Node.js (for development server)

### Installation & Setup

1. **Clone or download** this repository
2. **Install dependencies** (for live reload):
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```
This starts a server at `http://localhost:3000` with automatic browser refresh.

### Alternative Setup Methods

**Simple static server:**
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

**Direct file opening:**
- Simply open `index.html` in your web browser

## 📁 Project Structure

```
threejs-stars/
├── index.html      # Main HTML file with Three.js dependencies
├── styles.css      # CSS styling and UI
├── main.js         # Core Three.js scene, physics, and logic
├── package.json    # Node.js dependencies and scripts
├── dev-server.js   # Custom development server with live reload
└── README.md       # This documentation
```

## 🎯 Key Behaviors

### Sphere Movement
- **Smooth Acceleration**: Gradual speed buildup with realistic physics
- **Natural Deceleration**: Friction-based slowing when keys are released
- **Pullback Forces**: Gentle return to center position
- **Boundary Limits**: Maximum deviation from center path

### Star Interactions
- **Push Physics**: Stars are pushed away from the sphere
- **Return Mechanics**: Stars slowly drift back to original positions
- **Chain Reactions**: Stars can push other stars in chain mode
- **Size Variety**: Stars range from 0.75x to 2.5x base size

### Camera System
- **Orbital Controls**: Mouse drag to orbit around sphere
- **Smooth Dampening**: Natural camera movement with momentum
- **Zoom Limits**: Constrained zoom range for optimal viewing
- **Following Behavior**: Camera always tracks the sphere

### Performance Features
- **Real-time Monitoring**: Live FPS counter and performance graph
- **Adaptive Quality**: Automatic quality adjustment
- **Smart Culling**: Only render visible clusters
- **Memory Management**: Efficient object pooling and cleanup

## 🎨 Customization

### Visual Parameters
- **Star Count**: Modify cluster density and star counts
- **Colors**: Adjust star colors and cluster themes
- **Lighting**: Modify ambient, directional, and point light settings
- **Materials**: Change emissive intensities and colors

### Physics Parameters
- **Forces**: Adjust push forces and interaction radii
- **Damping**: Modify friction and return forces
- **Speeds**: Change movement speeds and acceleration rates
- **Modes**: Switch between standard and chain physics

### Performance Settings
- **LOD Distances**: Adjust level-of-detail thresholds
- **Render Distance**: Modify cluster visibility range
- **Quality Multipliers**: Change adaptive quality settings
- **Particle Counts**: Adjust trail and effect particle limits

## 🌐 Browser Support

- **Chrome/Edge**: Full support with optimal performance
- **Firefox**: Full support with good performance
- **Safari**: Full support with WebGL compatibility
- **Mobile Browsers**: Touch controls and responsive design

## 📋 Feature Checklist

### ✅ Completed Features
- [x] Interactive 3D starfield with thousands of stars
- [x] Smooth sphere movement with WASD controls
- [x] Mouse camera controls (orbit, zoom)
- [x] Physics-based star interactions
- [x] Dynamic star clusters with procedural generation
- [x] Particle trail system
- [x] Point lighting and emissive materials
- [x] Performance monitoring and optimization
- [x] Hybrid 3D/2D rendering system
- [x] Frame-rate independent movement
- [x] Smooth deceleration and pullback forces
- [x] Multi-cluster interaction support
- [x] Chain reaction physics mode
- [x] Dynamic skybox with procedural stars
- [x] Color variety and size variation
- [x] Object pooling and memory optimization
- [x] Level of detail (LOD) system
- [x] Adaptive quality adjustment

### 🔄 In Progress / Known Issues
- [ ] **White long tail only shows on some angles** - Particle trail visibility issue
- [ ] **Improve minimum frame rates** - Performance optimization needed
- [ ] **Fix speed to time not frames** - Frame-rate independence improvements
- [ ] **Add lighting** - Enhanced lighting system (partially implemented)

### 🎯 Future Enhancements
- [ ] Post-processing effects (bloom, depth of field)
- [ ] Sound system with spatial audio
- [ ] More physics modes and interactions
- [ ] Advanced particle effects
- [ ] VR/AR support
- [ ] Multiplayer capabilities
- [ ] Save/load system for custom configurations

## 📄 License

This project is open source and available under the MIT License.

---

*Experience the cosmos like never before - navigate through infinite star clusters and interact with the physics of space itself!*