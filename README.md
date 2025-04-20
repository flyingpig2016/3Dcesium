# Smart Home 3D Topology Dashboard

A modern and sleek UI dashboard for visualizing and managing a smart home network topology in a 3D environment. The project uses Vue 3 for UI components and Three.js for 3D rendering.

## Features

- 3D visualization of a smart home network topology in an apartment layout
- Interactive 3D device models with tooltips and highlights
- Real-time network data visualization with animated data transfer lines
- Glassmorphism UI design with dark mode support
- Device status monitoring and management
- Drag-to-rotate 3D view and zoom controls
- Responsive layout

## Tech Stack

- Vue 3 with Composition API
- Three.js for 3D visualization
- Pinia for state management
- Vite for fast development and building

## Project Setup

```sh
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Project Structure

- `src/views/Dashboard.vue` - Main dashboard view
- `src/components/3d/NetworkTopology.vue` - 3D network visualization component
- `src/stores/network.js` - Network data store
- `src/assets/main.css` - Global CSS styles

## Usage

The dashboard provides the following features:
- View the 3D topology of your smart home network
- Monitor device status and connections
- Toggle device activity and status
- Drag to rotate the 3D view and zoom in/out
- Hover over devices to see tooltips
- Click on a device to select it and see detailed information

## License

MIT
