# Three.js Stars

A beautiful interactive 3D starfield created with Three.js.

## Features

- ✨ Animated starfield with 1000+ stars
- 🎨 Dynamic colors (white to blue tint)
- 🖱️ Mouse interaction for camera movement
- 📱 Responsive design
- 🎯 Smooth animations

## Getting Started

### Prerequisites

- A modern web browser with WebGL support
- Node.js (for live reload development server)

### Installation

1. Clone or download this repository
2. Install dependencies (for live reload):
```bash
npm install
```

### Development with Live Reload

For the best development experience with automatic refresh on save:

```bash
# Start development server with live reload
npm run dev
```

This will:
- Start a server at `http://localhost:3000`
- Automatically open your browser
- **Refresh the page whenever you save any file**

### Alternative Setup Methods

**Simple static server (no live reload):**
```bash
# Using Python
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

**Direct file opening:**
- Simply open `index.html` in your web browser (no live reload)

## Project Structure

```
threejs-stars/
├── index.html      # Main HTML file
├── styles.css      # CSS styling
├── main.js         # Three.js scene and logic
├── package.json    # Node.js dependencies and scripts
├── dev-server.js   # Custom development server with live reload
└── README.md       # This file
```

## How It Works

The project uses Three.js to create a 3D scene with:

- **Scene**: The 3D world container
- **Camera**: Perspective camera for viewing the scene
- **Renderer**: WebGL renderer for drawing to the canvas
- **Stars**: Points geometry with random positions and colors
- **Animation**: Continuous rotation and mouse interaction

## Customization

You can easily modify the starfield by changing parameters in `main.js`:

- `starCount`: Number of stars (default: 1000)
- `size`: Star size (default: 0.1)
- `opacity`: Star transparency (default: 0.8)
- Colors: Modify the HSL values for different color schemes

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## License

This project is open source and available under the MIT License.

