<template>
  <div class="network-topology-container">
    <div class="rendering-container" ref="container"></div>
    
    <!-- 连接线图例 -->
    <div class="topology-legend">
      <div class="legend-title">连接线类型</div>
      <div class="legend-item">
        <div class="legend-line solid-line"></div>
        <div class="legend-text">实线 - 有线连接</div>
      </div>
      <div class="legend-item">
        <div class="legend-line dashed-line"></div>
        <div class="legend-text">虚线 - 无线连接</div>
      </div>
      <div class="legend-item">
        <div class="legend-line fiber-line"></div>
        <div class="legend-text">光纤线 - 高速连接</div>
      </div>
    </div>
    
    <!-- Tooltip -->
    <div 
      v-if="tooltipVisible" 
      class="tooltip" 
      :style="{ top: tooltipPosition.y + 'px', left: tooltipPosition.x + 'px' }"
    >
      <div class="tooltip-title">{{ tooltipContent.title }}</div>
      <div class="tooltip-status">
        Status: <span :class="`status-${tooltipContent.status}`">{{ tooltipContent.status }}</span>
      </div>
      <div class="tooltip-details" v-if="tooltipContent.details">
        {{ tooltipContent.details }}
      </div>
    </div>
    
    <!-- 调试面板 -->
    <div class="debug-panel" v-if="debugMode">
      <div class="debug-header">
        <h3>模型调试</h3>
        <button class="close-btn" @click="toggleDebugMode">×</button>
      </div>
      
      <div class="debug-content">
        <div class="form-group">
          <label>选择设备:</label>
          <select v-model="selectedDevice" @change="onDeviceSelected">
            <option value="">-- 选择设备 --</option>
            <option value="fttr">FTTR</option>
            <option v-for="device in networkStore.devices" :key="device.id" :value="device.id">
              {{ device.name }} ({{ device.type }})
            </option>
          </select>
        </div>
        
        <template v-if="selectedDevice">
          <h4>比例</h4>
          <div class="form-group">
            <label>比例:</label>
            <input type="range" v-model="scale" min="1" max="2" step="0.05" @input="updateModel" />
            <span>{{ scale }}</span>
          </div>
          
          <h4>位置</h4>
          <div class="form-group">
            <label>X:</label>
            <input type="range" v-model="positionX" min="-10" max="10" step="0.1" @input="updateModel" />
            <input type="number" v-model="positionX" min="-10" max="10" step="0.1" @input="updateModel" />
          </div>
          <div class="form-group">
            <label>Y:</label>
            <input type="range" v-model="positionY" min="-1" max="2" step="0.05" @input="updateModel" />
            <input type="number" v-model="positionY" min="-1" max="2" step="0.05" @input="updateModel" />
          </div>
          <div class="form-group">
            <label>Z:</label>
            <input type="range" v-model="positionZ" min="-10" max="10" step="0.1" @input="updateModel" />
            <input type="number" v-model="positionZ" min="-10" max="10" step="0.1" @input="updateModel" />
          </div>
          
          <h4>旋转 (弧度)</h4>
          <div class="form-group">
            <label>X轴:</label>
            <input type="range" v-model="rotationX" min="0" max="6.28" step="0.1" @input="updateModel" />
            <input type="number" v-model="rotationX" min="0" max="6.28" step="0.1" @input="updateModel" />
          </div>
          <div class="form-group">
            <label>Y轴:</label>
            <input type="range" v-model="rotationY" min="0" max="6.28" step="0.1" @input="updateModel" />
            <input type="number" v-model="rotationY" min="0" max="6.28" step="0.1" @input="updateModel" />
          </div>
          <div class="form-group">
            <label>Z轴:</label>
            <input type="range" v-model="rotationZ" min="0" max="6.28" step="0.1" @input="updateModel" />
            <input type="number" v-model="rotationZ" min="0" max="6.28" step="0.1" @input="updateModel" />
          </div>
          
          <button class="reset-btn" @click="resetModel">重置</button>
          <button class="apply-btn" @click="saveSettings">保存设置</button>
        </template>
      </div>
    </div>
    
    <!-- 调试模式切换按钮 -->
    <button class="debug-toggle-btn" @click="toggleDebugMode">
      {{ debugMode ? '关闭调试' : '模型调试' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useNetworkStore } from '../../stores/network';

// Props and emits
const props = defineProps({
  darkMode: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['deviceSelected']);

// Store
const networkStore = useNetworkStore();

// Refs
const container = ref(null);
// Use shallowRef for Three.js objects
const scene = shallowRef(null);
const camera = shallowRef(null);
const renderer = shallowRef(null);
const labelRenderer = shallowRef(null);
const controls = shallowRef(null);
const raycaster = shallowRef(new THREE.Raycaster());
const mouse = shallowRef(new THREE.Vector2());
const tooltipContent = ref({ title: '', status: '', details: '' });
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipVisible = ref(false);
const showAnimation = ref(true); // Control animation visibility
const currentHighlightedDeviceId = ref(null); // 跟踪当前高亮的设备ID

// 3D Objects - use shallowRef for objects that have read-only properties
const deviceMeshes = shallowRef({});
const connectionLines = shallowRef([]);
const roomMeshes = shallowRef([]);
const modelLoader = shallowRef(new GLTFLoader());
const loadedModels = shallowRef({});

// 调试模式相关状态
const debugMode = ref(false);
const selectedDevice = ref('');
const scale = ref(1);
const positionX = ref(0);
const positionY = ref(0);
const positionZ = ref(0);
const rotationX = ref(0);
const rotationY = ref(0);
const rotationZ = ref(0);
const originalSettings = ref({});

// Toggle debug mode
const toggleDebugMode = () => {
  debugMode.value = !debugMode.value;
};

// Handle device selection in debug panel
const onDeviceSelected = () => {
  if (!selectedDevice.value) return;
  
  const device = deviceMeshes.value[selectedDevice.value];
  if (!device) return;
  
  // Store original settings for reset
  if (device.userData && device.userData.isModel) {
    originalSettings.value = {
      scale: device.userData.originalScale,
      position: {
        x: device.position.x,
        y: device.position.y,
        z: device.position.z
      },
      rotation: {
        x: device.rotation.x,
        y: device.rotation.y,
        z: device.rotation.z
      }
    };
    
    // Set current values
    scale.value = device.userData.originalScale;
  } else {
    originalSettings.value = {
      position: {
        x: device.position.x,
        y: device.position.y,
        z: device.position.z
      },
      rotation: {
        x: device.rotation.x,
        y: device.rotation.y,
        z: device.rotation.z
      }
    };
  }
  
  // Update form values
  positionX.value = device.position.x;
  positionY.value = device.position.y;
  positionZ.value = device.position.z;
  rotationX.value = device.rotation.x;
  rotationY.value = device.rotation.y;
  rotationZ.value = device.rotation.z;
};

// Update model based on form values
const updateModel = () => {
  if (!selectedDevice.value) return;
  
  const device = deviceMeshes.value[selectedDevice.value];
  if (!device) return;
  
  // Update position
  device.position.set(
    parseFloat(positionX.value),
    parseFloat(positionY.value),
    parseFloat(positionZ.value)
  );
  
  // Update rotation
  device.rotation.set(
    parseFloat(rotationX.value),
    parseFloat(rotationY.value),
    parseFloat(rotationZ.value)
  );
  
  // Update scale if it's a model
  if (device.userData && device.userData.isModel) {
    const newScale = parseFloat(scale.value);
    device.scale.set(newScale, newScale, newScale);
  }
};

// Reset model to original settings
const resetModel = () => {
  if (!selectedDevice.value || !originalSettings.value) return;
  
  const device = deviceMeshes.value[selectedDevice.value];
  if (!device) return;
  
  // Reset position
  device.position.set(
    originalSettings.value.position.x,
    originalSettings.value.position.y,
    originalSettings.value.position.z
  );
  
  // Reset rotation
  device.rotation.set(
    originalSettings.value.rotation.x,
    originalSettings.value.rotation.y,
    originalSettings.value.rotation.z
  );
  
  // Reset scale if it's a model
  if (device.userData && device.userData.isModel && originalSettings.value.scale) {
    device.scale.set(
      originalSettings.value.scale,
      originalSettings.value.scale,
      originalSettings.value.scale
    );
  }
  
  // Update form values
  positionX.value = device.position.x;
  positionY.value = device.position.y;
  positionZ.value = device.position.z;
  rotationX.value = device.rotation.x;
  rotationY.value = device.rotation.y;
  rotationZ.value = device.rotation.z;
  
  if (device.userData && device.userData.isModel) {
    scale.value = originalSettings.value.scale || 0.1;
  }
};

// Save current settings
const saveSettings = () => {
  if (!selectedDevice.value) return;
  
  const device = deviceMeshes.value[selectedDevice.value];
  if (!device) return;
  
  // Update original settings
  if (device.userData && device.userData.isModel) {
    device.userData.originalScale = parseFloat(scale.value);
  }
  
  // Could save to localStorage or a backend here
  console.log(`Saved settings for device ${selectedDevice.value}:`, {
    scale: scale.value,
    position: {
      x: positionX.value,
      y: positionY.value,
      z: positionZ.value
    },
    rotation: {
      x: rotationX.value,
      y: rotationY.value,
      z: rotationZ.value
    }
  });
  
  // Update original settings reference
  originalSettings.value = {
    scale: parseFloat(scale.value),
    position: {
      x: parseFloat(positionX.value),
      y: parseFloat(positionY.value),
      z: parseFloat(positionZ.value)
    },
    rotation: {
      x: parseFloat(rotationX.value),
      y: parseFloat(rotationY.value),
      z: parseFloat(rotationZ.value)
    }
  };
};

// Model mapping for different device types
const modelMapping = {
  office_computer:'office_computer.glb',
  livingcomputer:'livingcomputer.glb',
  tv: 'tv.glb',
  speaker: 'speaker.glb',
  print:'print.glb',
  stb:'stb.glb',
  ac: 'ac.glb',
  pc: 'computer.glb',
  fttr: 'fttr.glb',
  office_pc: 'office_computer.glb',
  vacuum: 'vacuum.glb',
  router:'router.glb',
  security_camera:'security_camera.glb'
};

// Initialize Three.js scene
const initScene = async () => {
  // Create scene
  scene.value = new THREE.Scene();
  scene.value.background = new THREE.Color(props.darkMode ? 0x0a1128 : 0xf8f9fa);

  // Create camera
  camera.value = new THREE.PerspectiveCamera(
    60,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    1000
  );
  camera.value.position.set(10, 15, 10);
  camera.value.lookAt(0, 0, 0);

  // Create renderer
  renderer.value = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  renderer.value.setSize(container.value.clientWidth, container.value.clientHeight);
  renderer.value.setPixelRatio(window.devicePixelRatio);
  renderer.value.shadowMap.enabled = true;
  renderer.value.shadowMap.type = THREE.PCFSoftShadowMap;
  container.value.appendChild(renderer.value.domElement);

  // Create CSS 2D renderer for labels
  labelRenderer.value = new CSS2DRenderer();
  labelRenderer.value.setSize(container.value.clientWidth, container.value.clientHeight);
  labelRenderer.value.domElement.style.position = 'absolute';
  labelRenderer.value.domElement.style.top = '0';
  labelRenderer.value.domElement.style.pointerEvents = 'none';
  container.value.appendChild(labelRenderer.value.domElement);

  // Add controls
  controls.value = new OrbitControls(camera.value, renderer.value.domElement);
  controls.value.enableDamping = true;
  controls.value.dampingFactor = 0.05;
  controls.value.minDistance = 5;
  controls.value.maxDistance = 30;
  
  // Add lights
  // 1. Main ambient light - stronger in dark mode
  const ambientLight = new THREE.AmbientLight(
    props.darkMode ? 0xf0e6d2 : 0xcccccc, 
    props.darkMode ? 0.7 : 0.6 // 更柔和的环境光
  );
  scene.value.add(ambientLight);

  // 2. Main directional light (like the sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.value.add(directionalLight);
  
  // 创建温暖氛围的灯光
  if (props.darkMode) {
    // 客厅主光源 - 温暖的橙黄色
    const livingRoomLight = new THREE.PointLight(0xffbb77, 1.0, 10);
    livingRoomLight.position.set(0, 2.2, 0);
    livingRoomLight.castShadow = true;
    scene.value.add(livingRoomLight);
    
    // 客厅柔光 - 装饰性光源
    const livingRoomAccentLight = new THREE.SpotLight(0xffe0a8, 0.7, 8, Math.PI / 6, 0.5, 1);
    livingRoomAccentLight.position.set(2, 2.5, 0);
    livingRoomAccentLight.target.position.set(2, 0, 0);
    scene.value.add(livingRoomAccentLight);
    scene.value.add(livingRoomAccentLight.target);
    
    // 主卧室 - 柔和的蓝紫色调
    const masterBedroomLight = new THREE.PointLight(0xb4c8ff, 0.7, 8);
    masterBedroomLight.position.set(-5, 2.0, -6);
    scene.value.add(masterBedroomLight);
    
    // 客卧 - 暖白色
    const guestBedroomLight = new THREE.PointLight(0xfff0dd, 0.7, 8);
    guestBedroomLight.position.set(5, 2.0, -6);
    scene.value.add(guestBedroomLight);
    
    // 客卧2 - 淡黄色调
    const bedroom2Light = new THREE.PointLight(0xffeedd, 0.7, 8);
    bedroom2Light.position.set(0, 2.0, -6);
    scene.value.add(bedroom2Light);
    
    // 添加电视背光效果
    const tvBacklight = new THREE.RectAreaLight(0x80a0ff, 2.0, 4, 1);
    tvBacklight.position.set(0, 1.0, -0.5);
    tvBacklight.lookAt(0, 1.0, 1);
    scene.value.add(tvBacklight);
    
    // 添加底部轮廓光效果
    const floorLight1 = new THREE.PointLight(0x6080ff, 0.5, 6);
    floorLight1.position.set(-4, 0.1, 0);
    scene.value.add(floorLight1);
    
    const floorLight2 = new THREE.PointLight(0xff8060, 0.5, 6);
    floorLight2.position.set(4, 0.1, 0);
    scene.value.add(floorLight2);
    
    // 添加随时间轻微变化的光效
    const subtleLight = new THREE.PointLight(0xffffaa, 0.3, 12);
    subtleLight.position.set(0, 3, -3);
    subtleLight.userData = { phase: 0 }; // 为动画添加相位
    scene.value.add(subtleLight);
  }

  // Create helper grid
  // const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
  // gridHelper.position.y = -0.5;
  // scene.value.add(gridHelper);

  // Create room layout
  createRoomLayout();

  // Load 3D models first
  try {
    await loadModels();
    console.log('Models loaded successfully');
  } catch (error) {
    console.error('Error loading models:', error);
  }

  // Create devices and connections
  createDevices();
  createConnections();

  // Add event listeners
  addEventListeners();
};

// Create apartment layout
const createRoomLayout = () => {
  // Create a temporary array to hold all room meshes
  const meshes = [...roomMeshes.value];
  
  // Define a consistent wall height
  const WALL_HEIGHT = 3.0;
  
  // Create floor
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xe8e8e8,
    transparent: false,
    opacity: 1.0,
    roughness: 0.4,
    metalness: 0.05,
    emissive: 0xd0d0d0,
    emissiveIntensity: 0.05,
    reflectivity: 0.2
  });
  
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  floor.position.z = -3;
  floor.receiveShadow = true;
  scene.value.add(floor);
  meshes.push(floor);
  
  // Create wall material
  const wallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xF8F8F8,
    transparent: true,
    opacity: .5,
    roughness: 0.2,
    metalness: 0.05,
    transmission: 0.0,
    reflectivity: 0.1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    emissive: 0xf0f0f0,
    emissiveIntensity: 0.05
  });
  
  // 为房间指示器创建玻璃地板材质
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfafafa,
    transparent: true,
    opacity: 0.7,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.4,
    reflectivity: 0.5,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    emissive: 0xffffff,
    emissiveIntensity: 0.05
  });

  
  
  // Room dimensions definitions
  const rooms = [
    { 
      name: "客厅", 
      width: 15, 
      depth: 6, 
      x: 0, 
      z: -0.5, 
      wallHeight: WALL_HEIGHT 
    },
    { 
      name: "主卧", 
      width: 5, 
      depth: 5, 
      x: -5, 
      z: -6, 
      wallHeight: WALL_HEIGHT
    },
    { 
      name: "客卧", 
      width: 5, 
      depth: 5, 
      x: 5, 
      z: -6, 
      wallHeight: WALL_HEIGHT 
    },
    { 
      name: "客卧", 
      width: 5, 
      depth: 5, 
      x: 0, 
      z: -6, 
      wallHeight: WALL_HEIGHT 
    }
  ];
  
  // 墙壁列表 - 包含所有将要创建的墙壁信息
  const wallsToCreate = [];
  
  // 首先收集所有需要创建的墙壁
  rooms.forEach(room => {
    const halfWidth = room.width / 2;
    const halfDepth = room.depth / 2;
    
    // 添加房间的四面墙到列表中
    wallsToCreate.push({
      x1: room.x - halfWidth, 
      z1: room.z + halfDepth,
      x2: room.x + halfWidth, 
      z2: room.z + halfDepth,
      height: room.wallHeight,
      type: 'front', // Z+
      room: room.name
    });
    
    wallsToCreate.push({
      x1: room.x - halfWidth, 
      z1: room.z - halfDepth,
      x2: room.x + halfWidth, 
      z2: room.z - halfDepth,
      height: room.wallHeight,
      type: 'back', // Z-
      room: room.name
    });
    
    wallsToCreate.push({
      x1: room.x - halfWidth, 
      z1: room.z - halfDepth,
      x2: room.x - halfWidth, 
      z2: room.z + halfDepth,
      height: room.wallHeight,
      type: 'left', // X-
      room: room.name
    });
    
    wallsToCreate.push({
      x1: room.x + halfWidth, 
      z1: room.z - halfDepth,
      x2: room.x + halfWidth, 
      z2: room.z + halfDepth,
      height: room.wallHeight,
      type: 'right', // X+
      room: room.name
    });
  });
  
  // 移除或合并重叠的墙壁
  const uniqueWalls = [];
  
  wallsToCreate.forEach(wall => {
    // 规范化墙壁坐标，确保x1,z1是左下角，x2,z2是右上角
    const normalizedWall = {
      ...wall,
      x1: Math.min(wall.x1, wall.x2),
      x2: Math.max(wall.x1, wall.x2),
      z1: Math.min(wall.z1, wall.z2),
      z2: Math.max(wall.z1, wall.z2)
    };
    
    // 检查这面墙是否与已有墙壁重叠
    const existingWallIndex = uniqueWalls.findIndex(existing => {
      // 判断是否是同一面墙（共线）
      const isParallelX = Math.abs(existing.z1 - normalizedWall.z1) < 0.01 && 
                          Math.abs(existing.z2 - normalizedWall.z2) < 0.01;
      const isParallelZ = Math.abs(existing.x1 - normalizedWall.x1) < 0.01 && 
                          Math.abs(existing.x2 - normalizedWall.x2) < 0.01;
      
      // 检查是否有重叠部分
      if (isParallelX) {
        return !(normalizedWall.x2 < existing.x1 || normalizedWall.x1 > existing.x2);
      }
      
      if (isParallelZ) {
        return !(normalizedWall.z2 < existing.z1 || normalizedWall.z1 > existing.z2);
      }
      
      return false;
    });
    
    if (existingWallIndex === -1) {
      // 如果没有重叠，添加到唯一墙壁列表
      uniqueWalls.push(normalizedWall);
    } else {
      // 如果有重叠，合并两面墙（取最大范围）
      const existingWall = uniqueWalls[existingWallIndex];
      
      // 更新墙的坐标为两者的并集
      uniqueWalls[existingWallIndex] = {
        ...existingWall,
        x1: Math.min(existingWall.x1, normalizedWall.x1),
        x2: Math.max(existingWall.x2, normalizedWall.x2),
        z1: Math.min(existingWall.z1, normalizedWall.z1),
        z2: Math.max(existingWall.z2, normalizedWall.z2),
      };
    }
  });
  
  // 创建去重后的墙壁
  uniqueWalls.forEach(wall => {
    const wallThickness = 0.1;
    let wallGeometry, wallPosition;
    
    // 判断墙壁是水平还是垂直
    const isVertical = Math.abs(wall.x1 - wall.x2) < 0.01;
    
    if (isVertical) {
      // 垂直于X轴的墙（沿Z轴）
      const length = wall.z2 - wall.z1;
      // 使用统一的墙壁高度
      wallGeometry = new THREE.BoxGeometry(wallThickness, WALL_HEIGHT, length);
      // 增加一个微小的偏移量，避免Z-fighting
      wallPosition = new THREE.Vector3(
        wall.x1 + (wall.x1 < 0 ? 0.005 : -0.005), 
        WALL_HEIGHT / 2, // 根据墙高度调整中心点高度
        (wall.z1 + wall.z2) / 2
      );
    } else {
      // 垂直于Z轴的墙（沿X轴）
      const length = wall.x2 - wall.x1;
      // 使用统一的墙壁高度
      wallGeometry = new THREE.BoxGeometry(length, WALL_HEIGHT, wallThickness);
      // 增加一个微小的偏移量，避免Z-fighting
      wallPosition = new THREE.Vector3(
        (wall.x1 + wall.x2) / 2, 
        WALL_HEIGHT / 2, // 根据墙高度调整中心点高度
        wall.z1 + (wall.z1 < 0 ? 0.005 : -0.005)
      );
    }
    
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    wallMesh.position.copy(wallPosition);
    scene.value.add(wallMesh);
    meshes.push(wallMesh);
  });
  
  // 创建房间的玻璃地板和标签
  rooms.forEach(room => {
    // Create glass floor to indicate room area
    const roomFloor = new THREE.Mesh(
      new THREE.BoxGeometry(room.width, 0.05, room.depth),
      glassMaterial.clone()
    );
    roomFloor.position.set(room.x, 0, room.z);
    scene.value.add(roomFloor);
    meshes.push(roomFloor);
    
    // Add text label for room
    addRoomLabel(room.name, room.x, room.z);
  });
  
  // 添加门框等特殊结构
  rooms.forEach(room => {
    const halfWidth = room.width / 2;
    const halfDepth = room.depth / 2;
    const wallThickness = 0.1;
    
    // 添加Living Room的前门
    if (room.name === "客厅") {
      const doorWidth = 1.5;
      const doorHeight = 0.8; // 调整高度与新墙壁高度匹配
      
      // 左侧门框
      const leftDoorSide = new THREE.Mesh(
        new THREE.BoxGeometry((room.width - doorWidth) / 2, doorHeight, wallThickness),
        wallMaterial.clone()
      );
      leftDoorSide.position.set(
        room.x - doorWidth / 2 - (room.width - doorWidth) / 4, 
        doorHeight / 2, 
        room.z + halfDepth
      );
      scene.value.add(leftDoorSide);
      meshes.push(leftDoorSide);
      
      // 右侧门框
      const rightDoorSide = new THREE.Mesh(
        new THREE.BoxGeometry((room.width - doorWidth) / 2, doorHeight, wallThickness),
        wallMaterial.clone()
      );
      rightDoorSide.position.set(
        room.x + doorWidth / 2 + (room.width - doorWidth) / 4, 
        doorHeight / 2, 
        room.z + halfDepth
      );
      scene.value.add(rightDoorSide);
      meshes.push(rightDoorSide);
      
      // 门框顶部
      const doorWall = new THREE.Mesh(
        new THREE.BoxGeometry(room.width - doorWidth, room.wallHeight - doorHeight, wallThickness),
        wallMaterial.clone()
      );
      doorWall.position.set(
        room.x, 
        room.wallHeight / 2 + doorHeight / 2, 
        room.z + halfDepth
      );
      scene.value.add(doorWall);
      meshes.push(doorWall);
    }
    
    // 添加Bedroom到Living Room的门
    if (room.name === "客卧") {
      const doorWidth = 1.2;
      const doorHeight = 0.8; // 调整高度与新墙壁高度匹配
      
      // 左侧门框
      const leftDoorSection = new THREE.Mesh(
        new THREE.BoxGeometry((room.width - doorWidth) / 2, room.wallHeight, wallThickness),
        wallMaterial.clone()
      );
      leftDoorSection.position.set(
        room.x - doorWidth / 2 - (room.width - doorWidth) / 4, 
        room.wallHeight / 2, 
        room.z + halfDepth
      );
      scene.value.add(leftDoorSection);
      meshes.push(leftDoorSection);
      
      // 右侧门框
      const rightDoorSection = new THREE.Mesh(
        new THREE.BoxGeometry((room.width - doorWidth) / 2, room.wallHeight, wallThickness),
        wallMaterial.clone()
      );
      rightDoorSection.position.set(
        room.x + doorWidth / 2 + (room.width - doorWidth) / 4, 
        room.wallHeight / 2, 
        room.z + halfDepth
      );
      scene.value.add(rightDoorSection);
      meshes.push(rightDoorSection);
      
      // 门框顶部
      const topDoorSection = new THREE.Mesh(
        new THREE.BoxGeometry(doorWidth, room.wallHeight - doorHeight, wallThickness),
        wallMaterial.clone()
      );
      topDoorSection.position.set(
        room.x, 
        doorHeight + (room.wallHeight - doorHeight) / 2, 
        room.z + halfDepth
      );
      scene.value.add(topDoorSection);
      meshes.push(topDoorSection);
    }
  });
  
  // Update roomMeshes with the collected meshes
  roomMeshes.value = meshes;
};

// Add room label
const addRoomLabel = (text, x, z) => {
  const div = document.createElement('div');
  div.className = 'room-label';
  div.textContent = text;
  div.style.color = props.darkMode ? '#ffffff' : '#333333';
  div.style.opacity = '0.7';
  
  const label = new CSS2DObject(div);
  label.position.set(x, 0.1, z);
  scene.value.add(label);
};

// Load 3D models
const loadModels = async () => {
  // Create a promise for each model to load
  const modelPromises = Object.entries(modelMapping).map(([type, filename]) => {
    return new Promise((resolve) => {
      modelLoader.value.load(`/src/assets/models/${filename}`, (gltf) => {
        const models = {...loadedModels.value};
        models[type] = gltf;
        loadedModels.value = models;
        resolve();
      }, undefined, (error) => {
        console.error(`Error loading model ${filename}:`, error);
        resolve();
      });
    });
  });
  
  // Wait for all models to load
  await Promise.all(modelPromises);
};

// Create device meshes
const createDevices = () => {
  // First check if we have loaded models
  if (Object.keys(loadedModels.value).length === 0) {
    console.warn('No 3D models loaded, using basic geometry');
  }
  
  // Create a temporary object to store meshes
  const meshes = {...deviceMeshes.value};
  
  // Create the central fttr mesh using model or fallback
  if (loadedModels.value['fttr']) {
    // Create a clone of the model
    const routerModel = loadedModels.value['fttr'].scene.clone();
    
    // Scale and position appropriately - adjust scale for new model
    const routerScale = .8; // 按实际大小，路由器比例提高
    routerModel.scale.set(routerScale, routerScale, routerScale);
    routerModel.position.set(0, 5, -4);
    routerModel.rotation.y = Math.PI / 2;
    
    // Add water ripple effect below the FTTR device
    const ripples = createWaterRipple(routerModel);
    scene.value.add(ripples);
    
    // Add fttr model to scene
    scene.value.add(routerModel);
    
    // Add user data for interaction
    routerModel.userData = { 
      type: 'fttr',
      name: 'FTTR 网关',
      status: 'online',
      details: 'Central network gateway',
      isModel: true,
      originalScale: routerScale,
      rippleEffect: ripples
    };
    
    // Store in deviceMeshes
    meshes['fttr'] = routerModel;
    
    // Add label
    addDeviceLabel('FTTR 网关', routerModel, 0.5); // 调整标签高度
    
    // Add title
    addFTTRTitle(routerModel);
  } else {
    // Fallback - create basic geometric shape
    const routerGeometry = new THREE.SphereGeometry(0.4, 32, 32); // 调整几何体大小
    const routerMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const fttr = new THREE.Mesh(routerGeometry, routerMaterial);
    fttr.position.set(0, 0.3, 0); // 调整位置以适应新地板
    fttr.castShadow = true;
    
    // Add water ripple effect below the FTTR device
    const ripples = createWaterRipple(fttr);
    scene.value.add(ripples);
    
    fttr.userData = { 
      type: 'fttr',
      name: 'FTTR 网关',
      status: 'online',
      details: 'Central network gateway',
      rippleEffect: ripples
    };
    scene.value.add(fttr);
    meshes['fttr'] = fttr;
    
    // Add fttr label
    addDeviceLabel('FTTR 网关', fttr, 0.5); // 调整标签高度
    
    // Add title
    addFTTRTitle(fttr);
  }
  
  // Create device meshes for all devices in store
  console.log(networkStore)
  networkStore.devices.forEach(device => {
    const modelType = device.type; // tv, speaker, ac, pc, etc.
    const devicePosition = device.position;
    let deviceObject;
    
    // Check if we have a 3D model for this device type
    if (loadedModels.value[modelType]) {
      // Use 3D model
      const model = loadedModels.value[modelType].scene.clone();
      
      // 微调位置，避免与墙壁完全贴合导致的Z-fighting
      const adjustedPosition = { ...devicePosition };
      // 针对不同设备类型进行特定调整
      if (modelType === 'ac') {
        // AC通常放在墙上，微移一点使其不与墙完全重合
        if (Math.abs(adjustedPosition.x) === 7.5) { // 如果AC在左右墙边
          adjustedPosition.x += (adjustedPosition.x > 0) ? -0.25 : 0.25;
        } else if (Math.abs(adjustedPosition.z) === 7.5) { // 如果AC在前后墙边
          adjustedPosition.z += (adjustedPosition.z > 0) ? -0.25 : 0.25;
        }
      }
      
      // 设置调整后的位置
      model.position.set(adjustedPosition.x, adjustedPosition.y, adjustedPosition.z);
      
      // Scale model appropriately based on type - adjust scales to realistic proportions
      let scale = 1; // 默认比例调整
      switch(modelType) {
        case 'livingcomputer':
          scale = 5; // 主卧电视按照房间大小调整 (约1.2米宽)
          // 调整电视高度，使其与墙面参考图一致
          // model.position.y = 0.3;
          model.rotation.y = Math.PI;
          // Rotate TV to face the center
          // model.lookAt(new THREE.Vector3(0, devicePosition.y, 0));
          break;
        case 'tv':
          scale = 3; // 电视按照房间大小调整 (约1.2米宽)
          // 调整电视高度，使其与墙面参考图一致
          // model.position.y = 0.3;
          // Rotate TV to face the center
          model.lookAt(new THREE.Vector3(0, devicePosition.y, 0));
          break;
        case 'print':
          scale = 2; // 打印机尺寸 (约0.3-0.4米高)
          // model.rotation.z = -Math.PI / 2;
          break;
        case 'stb':
          scale = .2; // 机顶盒尺寸 (约0.3-0.4米高)
          break;
        case 'security_camera':
          scale = .1; // 监控摄像头尺寸 (约0.3-0.4米高)
          // model.position.y = .3; // 调整高度
          // model.rotation.z = -Math.PI / 2;
          break;
        case 'pc':
          scale = 2; // 电脑
          break;
        case 'speaker':
          scale = .8; // 音箱尺寸 (约0.3-0.4米高)
          model.position.y = 1; // 调整高度
          model.rotation.z = -Math.PI / 2;
          break;
        case 'ac':
          scale = 1.5; // 空调尺寸 (约0.8-1米宽)
          // Wall AC units typically face the room
          if (devicePosition.x > 0) model.rotation.y = 0; 
          else if (devicePosition.x < 0) model.rotation.y = -Math.PI / 2;
          else if (devicePosition.z > 0) model.rotation.y = Math.PI;
          break;
        case 'office_pc':
          scale = 0.2; // 电脑尺寸 (约0.4-0.5米高)
          model.position.y = 0.2; // 调整高度
          break;
        case 'vacuum':
          scale = 1; // 扫地机器人尺寸 (直径约0.35米)
          // Place on floor
          model.position.y = 0.05;
          break;
        case 'router':
          scale = 1;
          model.position.y = -2;
          break;
        case 'fttr':
          scale = .5;
          break; 
        default:
          scale = 1;
          model.position.y = 0.2; // 调整默认高度
      }
      model.scale.set(scale, scale, scale);
      
      // Store original scale for reset after highlighting
      model.userData = { 
        type: device.type,
        id: device.id,
        name: device.name,
        status: device.status,
        active: device.active,
        details: `${device.type.charAt(0).toUpperCase() + device.type.slice(1)} device`,
        isModel: true,
        originalScale: scale
      };
      
      scene.value.add(model);
      deviceObject = model;
      
      // Add label - adjust label position for new models
      addDeviceLabel(device.name, model, 0.6); // 调整标签高度
    } else {
      // Fallback to basic geometric shapes
      let geometry, material;
      
      // Different geometries and materials based on device type
      switch(device.type) {
        case 'tv':
          geometry = new THREE.BoxGeometry(1.2, 0.7, 0.1);
          material = new THREE.MeshStandardMaterial({
            color: 0x3a86ff,
            emissive: 0x3a86ff,
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.3
          });
          break;
        case 'speaker':
          geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 32);
          material = new THREE.MeshStandardMaterial({
            color: 0xfb5607,
            emissive: 0xfb5607,
            emissiveIntensity: 0.3,
            metalness: 0.7,
            roughness: 0.3
          });
          break;
        case 'ac':
          geometry = new THREE.BoxGeometry(0.8, 0.3, 0.2);
          material = new THREE.MeshStandardMaterial({
            color: 0x80ffdb,
            emissive: 0x80ffdb,
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.3
          });
          break;
        case 'pc':
        case 'office_pc':
          geometry = new THREE.BoxGeometry(0.4, 0.4, 0.2);
          material = new THREE.MeshStandardMaterial({
            color: 0xd100d1,
            emissive: 0xd100d1,
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.3
          });
          break;
        case 'light':
          geometry = new THREE.SphereGeometry(0.2, 32, 16);
          material = new THREE.MeshStandardMaterial({
            color: 0xffd166,
            emissive: 0xffd166,
            emissiveIntensity: 0.8,
            metalness: 0.2,
            roughness: 0.2
          });
          break;
        default:
          geometry = new THREE.SphereGeometry(0.3, 32, 32);
          material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            emissive: 0xcccccc,
            emissiveIntensity: 0.3
          });
      }
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(device.position.x, device.position.y, device.position.z);
      // 调整高度以适应新的地板高度
      if (device.type === 'ac') {
        mesh.position.y = 0.4; // 空调高一点
      } else if (device.type === 'vacuum') {
        mesh.position.y = 0.05; // 扫地机器人贴地
      } else {
        mesh.position.y = 0.2; // 其他设备默认高度
      }
      
      mesh.castShadow = true;
      mesh.userData = { 
        type: device.type,
        id: device.id,
        name: device.name,
        status: device.status,
        active: device.active,
        details: `${device.type.charAt(0).toUpperCase() + device.type.slice(1)} device`
      };
      scene.value.add(mesh);
      deviceObject = mesh;
    }
    
    // Store reference to the device object (model or mesh)
    meshes[device.id] = deviceObject;
  });
  
  // Update the deviceMeshes
  deviceMeshes.value = meshes;
};

// Helper function to add device labels
const addDeviceLabel = (text, parent, offsetY = 0.5) => {
  const div = document.createElement('div');
  div.className = 'device-label';
  div.textContent = text;
  div.style.color = props.darkMode ? '#FFFFFF' : '#333333';
  
  const label = new CSS2DObject(div);
  
  // 为特定设备添加特殊处理
  if (parent.userData && parent.userData.id === 'tv1') {
    // 客厅电视特殊处理
    label.position.set(0, 1.1, 0);
  } else if (parent.userData && parent.userData.id === 'tv2') {
    // 电脑特殊处理
    label.position.set(0, 0.5, 0);
  }else if (parent.userData && parent.userData.id === 'router1') {
    // 打印机特殊处理
    label.position.set(0, 0.5, 0);
  } else if (parent.userData && parent.userData.isModel) {
    // 其他模型，按原来的逻辑处理
    // For models, we position the label above the model
    // We need to get the bounding box to determine the height
    const box = new THREE.Box3().setFromObject(parent);
    const height = box.max.y - box.min.y;
    label.position.set(0, height + offsetY, 0);
  } else {
    // For simple meshes
    label.position.set(0, offsetY, 0);
  }
  
  parent.add(label);
  return label;
};

// Helper function to add a title above the FTTR device
const addFTTRTitle = (parent) => {
  // Create title container
  const titleContainer = document.createElement('div');
  titleContainer.className = 'fttr-title-container';
  
  // Create title element
  const titleElement = document.createElement('div');
  titleElement.className = 'fttr-title';
  
  // Split text into parts for animation
  const titleParts = [
    '基于FTTR全光智慧家庭底座，',
    '打造存儲、安防、娱乐、康养等智家业务，',
    '助力运营商扩展Al服务边界'
  ];
  
  // Create spans for each part to enable animation
  titleParts.forEach((part, index) => {
    const partSpan = document.createElement('div');
    partSpan.className = 'title-part';
    partSpan.textContent = part;
    partSpan.style.animationDelay = `${0.5 + index * 0.3}s`;
    titleElement.appendChild(partSpan);
  });
  
  titleContainer.appendChild(titleElement);
  
  // Create CSS2D object for the title
  const titleLabel = new CSS2DObject(titleContainer);
  
  // Position the title above the FTTR device
  if (parent.userData && parent.userData.isModel) {
    const box = new THREE.Box3().setFromObject(parent);
    const height = box.max.y - box.min.y;
    titleLabel.position.set(0, height + 4, 0); // Position higher than regular label
  } else {
    titleLabel.position.set(0, 2.5, 0);
  }
  
  // Add the title to the parent object
  parent.add(titleLabel);
  return titleLabel;
};

// Create connections between devices
const createConnections = () => {
  // Create a temporary array to store connections
  const connections = [...connectionLines.value];
  
  // For each device, create its connections
  networkStore.devices.forEach(device => {
    if (device.connections) {
      device.connections.forEach(connection => {
        // 获取连接目标ID和线类型
        const connId = connection.target;
        const lineType = connection.lineType || networkStore.CONNECTION_TYPES.SOLID; // 默认为实线

        // Get the source device object
        const sourceDevice = deviceMeshes.value[device.id];
        // Get the target device object
        const targetDevice = deviceMeshes.value[connId];
        
        if (!sourceDevice || !targetDevice) {
          console.warn(`Could not find devices for connection: ${device.id} -> ${connId}`);
          return;
        }
        
        // Get positions - models might need different handling
        let startPosition, endPosition;
        
        // For source device
        if (sourceDevice.userData && sourceDevice.userData.isModel) {
          // Get center of the model by calculating its bounding box
          const box = new THREE.Box3().setFromObject(sourceDevice);
          const center = new THREE.Vector3();
          box.getCenter(center);
          startPosition = center;
        } else {
          startPosition = sourceDevice.position;
        }
        
        // For target device
        if (targetDevice.userData && targetDevice.userData.isModel) {
          // Get center of the model by calculating its bounding box
          const box = new THREE.Box3().setFromObject(targetDevice);
          const center = new THREE.Vector3();
          box.getCenter(center);
          endPosition = center;
        } else {
          endPosition = targetDevice.position;
        }
        
        // Create a curve for better visual appeal
        const curve = new THREE.CatmullRomCurve3([
          startPosition.clone(),
          new THREE.Vector3(
            (startPosition.x + endPosition.x) / 2,
            Math.max(startPosition.y, endPosition.y) + 1,
            (startPosition.z + endPosition.z) / 2
          ),
          endPosition.clone()
        ]);
        
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // 根据连接线类型设置颜色和材质
        let color, mainLineMaterial, outerGlowMaterial;
        
        if (lineType === networkStore.CONNECTION_TYPES.FIBER) {
          // 光纤线 - 黄色实线
          color = new THREE.Color(device.active ? 0xffd700 : 0x767676); // 金黄色
          mainLineMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            linewidth: 3
          });
          outerGlowMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
            transparent: true,
            opacity: 0.6,
            linewidth: 1
          });
        } else if (lineType === networkStore.CONNECTION_TYPES.DASHED) {
          // 虚线
          color = new THREE.Color(device.active ? 0x06d6a0 : 0x767676);
          // 创建虚线效果
          mainLineMaterial = new THREE.LineDashedMaterial({
            color: color,
            dashSize: 0.3,
            gapSize: 0.2,
            transparent: true,
            opacity: 0.9,
            linewidth: 2
          });
          outerGlowMaterial = new THREE.LineDashedMaterial({
            color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
            dashSize: 0.3,
            gapSize: 0.2,
            transparent: true,
            opacity: 0.4,
            linewidth: 1
          });
        } else {
          // 默认实线
          color = new THREE.Color(device.active ? 0x06d6a0 : 0x767676);
          mainLineMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            linewidth: 3
          });
          outerGlowMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
            transparent: true,
            opacity: 0.4,
            linewidth: 1
          });
        }
        
        const mainLine = new THREE.Line(geometry.clone(), mainLineMaterial);
        scene.value.add(mainLine);
        
        // 如果是虚线，需要计算线段长度
        if (lineType === networkStore.CONNECTION_TYPES.DASHED) {
          mainLine.computeLineDistances();
        }
        
        const outerGlow = new THREE.Line(geometry.clone(), outerGlowMaterial);
        scene.value.add(outerGlow);
        
        // 如果是虚线，同样需要计算外发光线段长度
        if (lineType === networkStore.CONNECTION_TYPES.DASHED) {
          outerGlow.computeLineDistances();
        }
        
        // Add data packets for active connections
        const packets = [];
        
        // Always use fttr as the source for packet animation regardless of connection direction
        // This makes all packets originate from the FTTR 网关
        let packetStartPosition, packetEndPosition, routerIsSource;
        
        // Determine if fttr is the source or target of this connection
        if (connId === 'fttr') {
          // Router is the target, we'll reverse the animation
          packetStartPosition = endPosition.clone();
          packetEndPosition = startPosition.clone();
          routerIsSource = true;
        } else if (device.id === 'fttr') {
          // Router is the source, keep animation as is
          packetStartPosition = startPosition.clone();
          packetEndPosition = endPosition.clone();
          routerIsSource = true;
        } else {
          // Neither device is the fttr, use fttr as starting point
          const routerDevice = deviceMeshes.value['fttr']; 
          if (routerDevice) {
            let routerPosition;
            if (routerDevice.userData && routerDevice.userData.isModel) {
              const box = new THREE.Box3().setFromObject(routerDevice);
              routerPosition = new THREE.Vector3();
              box.getCenter(routerPosition);
            } else {
              routerPosition = routerDevice.position.clone();
            }
            
            // First leg: fttr to source device
            const firstCurve = new THREE.CatmullRomCurve3([
              routerPosition,
              new THREE.Vector3(
                (routerPosition.x + startPosition.x) / 2,
                Math.max(routerPosition.y, startPosition.y) + 1,
                (routerPosition.z + startPosition.z) / 2
              ),
              startPosition.clone()
            ]);
            
            if (device.active) {
              // Create 2-3 data packets for the first leg
              const firstLegPacketCount = Math.floor(Math.random() * 2) + 1; // 1-2 packets
              
              for (let i = 0; i < firstLegPacketCount; i++) {
                createDataPacket(firstCurve, color, packets);
              }
            }
          }
          
          // Regular connection (second leg)
          packetStartPosition = startPosition.clone();
          packetEndPosition = endPosition.clone();
          routerIsSource = false;
        }
        
        // Create curve specifically for packets
        const packetCurve = new THREE.CatmullRomCurve3([
          packetStartPosition,
          new THREE.Vector3(
            (packetStartPosition.x + packetEndPosition.x) / 2,
            Math.max(packetStartPosition.y, packetEndPosition.y) + 1,
            (packetStartPosition.z + packetEndPosition.z) / 2
          ),
          packetEndPosition
        ]);
        
        if (device.active) {
          // Create 2-3 data packets
          const packetCount = Math.floor(Math.random() * 2) + 2; // 2-3 packets
          
          for (let i = 0; i < packetCount; i++) {
            createDataPacket(packetCurve, color, packets);
          }
        }
        
        // Add to temporary array instead of directly to reactive reference
        connections.push({
          mesh: mainLine,
          glowMesh: outerGlow,
          curve: curve,
          packetCurve: packetCurve,
          deviceA: device.id,
          deviceB: connId,
          lineType: lineType,
          originalColor: color.clone(),
          active: device.active,
          packets: packets,
          routerIsSource: routerIsSource
        });
      });
    }
  });
  
  // Update the reactive reference once
  connectionLines.value = connections;
};

// Helper function to create a data packet
const createDataPacket = (curve, color, packetsArray) => {
  // Create the packet geometry
  const packetGeometry = new THREE.SphereGeometry(0.06, 8, 8); // Slightly larger packets
  
  // Create a glowing material for the packet
  const packetMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: color,
    emissiveIntensity: 1.2, // Stronger glow
    transparent: true,
    opacity: 0.9
  });
  
  const packet = new THREE.Mesh(packetGeometry, packetMaterial);
  
  // Random initial position along the curve
  const initialProgress = Math.random();
  const initialPoint = curve.getPointAt(initialProgress);
  packet.position.copy(initialPoint);
  
  // Store animation data
  packet.userData = {
    curve: curve,
    progress: initialProgress,
    speed: 0.004 + Math.random() * 0.006 // Slightly faster
  };
  
  scene.value.add(packet);
  packetsArray.push(packet);
  
  return packet;
};

// Event handlers
const addEventListeners = () => {
  // Mouse move event for raycasting
  container.value.addEventListener('mousemove', onMouseMove);
  
  // Mouse click event for device selection
  container.value.addEventListener('click', onMouseClick);
};

const onMouseMove = (event) => {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = container.value.getBoundingClientRect();
  mouse.value.x = ((event.clientX - rect.left) / container.value.clientWidth) * 2 - 1;
  mouse.value.y = -((event.clientY - rect.top) / container.value.clientHeight) * 2 + 1;
  
  // Update the raycaster
  raycaster.value.setFromCamera(mouse.value, camera.value);
  
  // Get all objects for intersection
  let deviceObjects = [];
  
  // We need to handle 3D models differently as they have children
  Object.values(deviceMeshes.value).forEach(device => {
    if (device.userData && device.userData.isModel) {
      // For 3D models, we need to test all meshes in the model
      device.traverse((child) => {
        if (child.isMesh) {
          child.userData = device.userData; // Copy userData to all children
          deviceObjects.push(child);
        }
      });
    } else {
      // Regular mesh
      deviceObjects.push(device);
    }
  });
  
  const intersects = raycaster.value.intersectObjects(deviceObjects);
  
  if (intersects.length > 0) {
    // Mouse is over a device
    const device = intersects[0].object;
    const deviceId = device.userData.id;
    
    // Show tooltip with device info
    tooltipContent.value = {
      title: device.userData.name,
      status: device.userData.status,
      details: device.userData.details
    };
    
    // Set tooltip position
    tooltipPosition.value = {
      x: event.clientX - rect.left + 15,
      y: event.clientY - rect.top + 15
    };
    
    // Show tooltip
    tooltipVisible.value = true;
    
    // 只有当前悬停的设备与之前高亮的设备不同时，才更新高亮状态
    if (currentHighlightedDeviceId.value !== deviceId) {
      // 如果之前有高亮设备，先重置
      if (currentHighlightedDeviceId.value) {
        resetHighlights();
      }
      
      // 高亮新设备
      highlightDevice(deviceId);
      currentHighlightedDeviceId.value = deviceId;
    }
    
    // Set cursor to pointer
    container.value.style.cursor = 'pointer';
  } else {
    // Mouse is not over a device
    tooltipVisible.value = false;
    
    // 只有当前有高亮设备时才重置
    if (currentHighlightedDeviceId.value) {
      resetHighlights();
      currentHighlightedDeviceId.value = null;
    }
    
    container.value.style.cursor = 'auto';
  }
};

const onMouseClick = (event) => {
  // Raycast to find clicked device
  raycaster.value.setFromCamera(mouse.value, camera.value);
  
  // Get all objects for intersection
  let deviceObjects = [];
  
  // Handle 3D models
  Object.values(deviceMeshes.value).forEach(device => {
    if (device.userData && device.userData.isModel) {
      // For 3D models, we need to test all meshes in the model
      device.traverse((child) => {
        if (child.isMesh) {
          child.userData = device.userData; // Copy userData to all children
          deviceObjects.push(child);
        }
      });
    } else {
      // Regular mesh
      deviceObjects.push(device);
    }
  });
  
  const intersects = raycaster.value.intersectObjects(deviceObjects);
  
  if (intersects.length > 0) {
    const device = intersects[0].object;
    emit('deviceSelected', device.userData.id);
  }
};

// Highlight device and its connections
const highlightDevice = (deviceId) => {
  if (!deviceId) return;
  
  // Highlight the device mesh by scaling it
  if (deviceMeshes.value[deviceId]) {
    const device = deviceMeshes.value[deviceId];
    
    if (device.userData && device.userData.isModel) {
      // For 3D models, we scale the whole model
      device.scale.multiplyScalar(1.2);
      
      // Also might need to adjust emissive intensity for better highlighting
      device.traverse((child) => {
        if (child.isMesh && child.material) {
          // Store original emissive if not stored yet
          if (!child.userData.originalEmissive) {
            child.userData.originalEmissive = {
              color: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000),
              intensity: child.material.emissiveIntensity || 0
            };
          }
          
          // Enhance emissive for highlight
          if (child.material.emissive) {
            child.material.emissive.set(0xff9500);
            child.material.emissiveIntensity = 0.5;
          }
        }
      });
    } else {
      // For simple meshes
      device.scale.set(1.2, 1.2, 1.2);
    }
  }
  
  // Highlight connected lines and increase packet speed
  connectionLines.value.forEach(line => {
    if (line.deviceA === deviceId || line.deviceB === deviceId) {
      // Highlight the main line
      line.mesh.material.color.set(new THREE.Color(0xff9500));
      line.mesh.material.opacity = 1.0;
      
      // Highlight the glow line
      line.glowMesh.material.color.set(new THREE.Color(0xff9500).lerp(new THREE.Color(0xffffff), 0.5));
      line.glowMesh.material.opacity = 0.8;
      
      // Make packets brighter and faster if present
      if (line.packets && line.packets.length > 0) {
        line.packets.forEach(packet => {
          packet.material.emissive.set(0xff9500);
          packet.material.emissiveIntensity = 1.5;
          packet.userData.speed *= 1.5; // Make packets move faster when highlighted
        });
      }
    }
  });
};

// Reset highlights
const resetHighlights = () => {
  if (!scene.value) return;
  
  // Reset all device scales
  Object.values(deviceMeshes.value).forEach(mesh => {
    if (mesh.userData && mesh.userData.isModel) {
      // For 3D models, reset scale
      const originalScale = mesh.userData.originalScale || 1;
      // Reset to original scale
      mesh.scale.set(originalScale, originalScale, originalScale);
      
      // Reset emissive properties
      mesh.traverse((child) => {
        if (child.isMesh && child.material && child.userData.originalEmissive) {
          child.material.emissive.copy(child.userData.originalEmissive.color);
          child.material.emissiveIntensity = child.userData.originalEmissive.intensity;
        }
      });
    } else {
      // For simple meshes
      mesh.scale.set(1, 1, 1);
    }
  });
  
  // If we're not highlighting any device, we still need to ensure the correct 
  // color is used for each line based on its type
  connectionLines.value.forEach(line => {
    const device = networkStore.devices.find(d => d.id === line.deviceA);
    if (device && device.active) {
      // 根据线条类型使用固定颜色
      if (line.lineType === networkStore.CONNECTION_TYPES.FIBER) {
        // 光纤线 - 黄色
        line.mesh.material.color.set(new THREE.Color(0xffd700));
        line.mesh.material.opacity = 0.9;
        
        // 发光线
        line.glowMesh.material.color.set(new THREE.Color(0xffd700).lerp(new THREE.Color(0xffffff), 0.5));
        line.glowMesh.material.opacity = 0.6;
      } else if (line.lineType === networkStore.CONNECTION_TYPES.DASHED) {
        // 虚线 - 绿色
        line.mesh.material.color.set(new THREE.Color(0x06d6a0));
        line.mesh.material.opacity = 0.9;
        
        // 发光线
        line.glowMesh.material.color.set(new THREE.Color(0x06d6a0).lerp(new THREE.Color(0xffffff), 0.5));
        line.glowMesh.material.opacity = 0.4;
      } else {
        // 默认实线 - 绿色
        line.mesh.material.color.set(new THREE.Color(0x06d6a0));
        line.mesh.material.opacity = 0.9;
        
        // 发光线
        line.glowMesh.material.color.set(new THREE.Color(0x06d6a0).lerp(new THREE.Color(0xffffff), 0.5));
        line.glowMesh.material.opacity = 0.4;
      }
    } else {
      // 非活跃连接使用灰色
      line.mesh.material.color.set(new THREE.Color(0x767676));
      line.mesh.material.opacity = 0.3;
      
      line.glowMesh.material.color.set(new THREE.Color(0x767676).lerp(new THREE.Color(0xffffff), 0.5));
      line.glowMesh.material.opacity = 0.1;
    }
    
    // Reset packet properties
    if (line.packets && line.packets.length > 0) {
      line.packets.forEach(packet => {
        // Only adjust properties of visible packets
        if (packet.visible) {
          // 根据线条类型设置数据包的颜色
          if (line.lineType === networkStore.CONNECTION_TYPES.FIBER) {
            packet.material.emissive.set(0xffd700);
          } else {
            packet.material.emissive.set(0x06d6a0);
          }
          packet.material.emissiveIntensity = 1.2;
          // Reset packet speed to original
          packet.userData.speed = 0.004 + Math.random() * 0.006;
        }
      });
    }
  });
};

// Animation function
const animate = () => {
  if (!scene.value || !camera.value || !renderer.value) return;
  
  // Request next animation frame
  requestAnimationFrame(animate);
  
  // Update controls
  controls.value.update();
  
  // Get current time for animations
  const time = Date.now() * 0.001;
  
  // 更新水波纹效果
  scene.value.traverse((object) => {
    // 找到所有水波纹组
    if (object.userData && object.userData.ripples) {
      const ripples = object.userData.ripples;
      const centerGlow = object.userData.centerGlow;
      const colors = object.userData.colors;
      
      // 更新中心发光效果
      if (centerGlow && centerGlow.userData.pulsate) {
        // 光晕脉动效果
        const glowIntensity = 0.7 + Math.sin(time * 2) * 0.3;
        centerGlow.material.emissiveIntensity = glowIntensity;
        
        // 光晕尺寸小幅度变化
        const glowScale = 1.0 + Math.sin(time * 1.5) * 0.1;
        centerGlow.scale.set(glowScale, glowScale, glowScale);
        
        // 光晕颜色微妙变化
        const hue = (time * 0.05) % 1;
        const saturation = 0.8;
        const lightness = 0.5 + Math.sin(time) * 0.1;
        centerGlow.material.emissive.setHSL(hue, saturation, lightness);
        centerGlow.material.color.copy(centerGlow.material.emissive);
      }
      
      // 更新每个波纹的缩放和透明度
      ripples.forEach((ripple, index) => {
        const params = ripple.userData;
        // 计算当前阶段 - 使用sin函数使波纹循环扩散
        const phase = (Math.sin(time * params.animationSpeed + params.animationOffset) + 1) / 2;
        
        // 计算当前缩放 - 从初始到最大
        const scale = params.initialScale + phase * (params.maxScale - params.initialScale);
        ripple.scale.set(scale, scale, scale);
        
        // 反向计算透明度 - 随着扩散而减小
        ripple.material.opacity = params.initialOpacity * (1 - phase * 0.85);
        
        // 添加颜色过渡效果
        if (colors && params.baseColor) {
          // 为每个波纹创建独特的颜色变化
          const colorShift = (time * 0.2 + index * 0.3) % 1.0;
          const nextColorIndex = (params.colorIndex + 1) % colors.length;
          const currentColor = params.baseColor.clone();
          const targetColor = colors[nextColorIndex].clone();
          
          // 根据扩散相位混合颜色
          const mixedColor = currentColor.lerp(targetColor, Math.sin(colorShift * Math.PI * 2) * 0.5 + 0.5);
          ripple.material.color.copy(mixedColor);
          ripple.material.emissive.copy(mixedColor);
          
          // 随着扩散调整发光强度
          ripple.material.emissiveIntensity = 0.6 * (1 - phase * 0.5);
        }
      });
    }
  });
  
  // 更新随时间变化的光效
  scene.value.traverse((object) => {
    // 找到我们标记了相位的光源
    if (object instanceof THREE.PointLight && object.userData && object.userData.phase !== undefined) {
      // 缓慢呼吸效果
      const intensity = 0.2 + Math.sin(time * 0.5 + object.userData.phase) * 0.1;
      object.intensity = intensity;
      
      // 微妙的颜色变化
      const hue = (Math.sin(time * 0.1) * 0.05 + 0.15) % 1.0; // 在黄色调范围内变化
      const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
      object.color.copy(color);
    }
    
    // 电视背光随时间变化
    if (object instanceof THREE.RectAreaLight) {
      // 模拟电视画面变化导致的光线变化
      const tvHue = (time * 0.1) % 1.0;
      const tvSaturation = 0.7 + Math.sin(time) * 0.3;
      const tvColor = new THREE.Color().setHSL(tvHue, tvSaturation, 0.5);
      object.color.copy(tvColor);
      
      // 强度微小波动
      object.intensity = 1.8 + Math.sin(time * 2) * 0.4;
    }
    
    // 底部轮廓光效果变化
    if (object instanceof THREE.PointLight && 
        (object.position.y < 0.2 && object.position.y > 0)) {
      // 使红蓝光效交替呼吸
      if (object.color.r > object.color.b) { // 红色光源
        object.intensity = 0.4 + Math.sin(time * 1.5) * 0.2;
      } else { // 蓝色光源
        object.intensity = 0.4 + Math.sin(time * 1.5 + Math.PI) * 0.2; // 反相位
      }
    }
  });
  
  // Animate active connections
  connectionLines.value.forEach(line => {
    const device = networkStore.devices.find(d => d.id === line.deviceA);
    if (device && device.active) {
      // Get current time for animations
      const time = Date.now() * 0.001;
      
      // Pulse the main line opacity for active connections
      const pulse = Math.sin(time * 3) * 0.3 + 0.7;
      line.mesh.material.opacity = pulse;
      
      // Animate glow effect - make it pulse with a slight phase shift
      const glowPulse = Math.sin(time * 3 + 0.5) * 0.3 + 0.7;
      line.glowMesh.material.opacity = glowPulse * 0.6;
      
      // 移除颜色流动效果，使用固定颜色
      // 为不同类型的线使用固定颜色
      if (line.lineType === networkStore.CONNECTION_TYPES.FIBER) {
        // 光纤线固定为黄色
        line.glowMesh.material.color.set(new THREE.Color(0xffd700).lerp(new THREE.Color(0xffffff), 0.5));
      } else if (line.lineType === networkStore.CONNECTION_TYPES.DASHED) {
        // 虚线固定为绿色
        line.glowMesh.material.color.set(new THREE.Color(0x06d6a0).lerp(new THREE.Color(0xffffff), 0.5));
      } else {
        // 实线固定为绿色
        line.glowMesh.material.color.set(new THREE.Color(0x06d6a0).lerp(new THREE.Color(0xffffff), 0.5));
      }
      
      // Animate data packets along the curve
      if (showAnimation.value && line.packets && line.packets.length > 0) {
        line.packets.forEach(packet => {
          packet.visible = true;
          
          // Update progress along the curve
          packet.userData.progress += packet.userData.speed;
          
          // Reset when reaching the end
          if (packet.userData.progress > 1) {
            packet.userData.progress = 0;
          }
          
          // Get new position from the appropriate curve
          const curve = packet.userData.curve;
          const newPosition = curve.getPointAt(packet.userData.progress);
          packet.position.copy(newPosition);
          
          // Add a slight pulse to the packet size and opacity
          const packetPulse = Math.sin(time * 8 + packet.userData.progress * 10) * 0.2 + 0.8;
          packet.scale.set(packetPulse, packetPulse, packetPulse);
          packet.material.opacity = packetPulse + 0.2;
          
          // 使用固定的发光强度，不再随时间变化
          packet.material.emissiveIntensity = 1.2;
        });
      } else if (line.packets) {
        // Hide packets if animation is disabled
        line.packets.forEach(packet => {
          packet.visible = false;
        });
      }
    } else {
      // Dim the lines for inactive connections
      line.mesh.material.opacity = 0.3;
      line.glowMesh.material.opacity = 0.1;
      
      // Hide packets for inactive connections
      if (line.packets) {
        line.packets.forEach(packet => {
          packet.visible = false;
        });
      }
    }
  });
  
  // Render scene
  renderer.value.render(scene.value, camera.value);
  labelRenderer.value.render(scene.value, camera.value);
};

// Update on dark mode change
watch(() => props.darkMode, (newMode) => {
  if (scene.value) {
    // Update scene background
    scene.value.background = new THREE.Color(newMode ? 0x0a1128 : 0xf8f9fa);
    
    // Update floor color - need to check if roomMeshes has elements
    if (roomMeshes.value.length > 0) {
      // Get floor mesh (first element in roomMeshes)
      const floor = roomMeshes.value[0];
      // Create new material with updated color to avoid modifying the read-only one
      const newMaterial = floor.material.clone();
      newMaterial.color.set(newMode ? 0x353540 : 0xecece8);
      newMaterial.emissive.set(newMode ? 0x202030 : 0x000000);
      newMaterial.emissiveIntensity = newMode ? 0.15 : 0;
      floor.material = newMaterial;
      
      // Update all wall materials
      for (let i = 1; i < roomMeshes.value.length; i++) {
        const mesh = roomMeshes.value[i];
        const newWallMaterial = mesh.material.clone();
        newWallMaterial.color.set(newMode ? 0x3a3a48 : 0xe8e8e8);
        newWallMaterial.emissive.set(newMode ? 0x22223a : 0x000000);
        newWallMaterial.emissiveIntensity = newMode ? 0.15 : 0;
        mesh.material = newWallMaterial;
      }
    }
    
    // Update room labels
    document.querySelectorAll('.room-label').forEach(label => {
      label.style.color = newMode ? '#ffffff' : '#333333';
    });
    
    // Remove old lights and add new ones based on dark mode
    // First, find and remove all point and hemisphere lights
    const lightsToRemove = [];
    scene.value.traverse((object) => {
      if (object instanceof THREE.PointLight || 
          object instanceof THREE.HemisphereLight ||
          object instanceof THREE.SpotLight ||
          object instanceof THREE.RectAreaLight) {
        lightsToRemove.push(object);
      }
    });
    
    lightsToRemove.forEach(light => {
      scene.value.remove(light);
    });
    
    // Update ambient light
    scene.value.traverse((object) => {
      if (object instanceof THREE.AmbientLight) {
        object.color.set(newMode ? 0xf0e6d2 : 0xcccccc);
        object.intensity = newMode ? 0.7 : 0.6;
      }
      if (object instanceof THREE.DirectionalLight) {
        object.intensity = newMode ? 0.8 : 1.0;
      }
    });
    
    // Add new lights for dark mode if needed
    if (newMode) {
      // 客厅主光源 - 温暖的橙黄色
      const livingRoomLight = new THREE.PointLight(0xffbb77, 1.0, 10);
      livingRoomLight.position.set(0, 2.2, 0);
      livingRoomLight.castShadow = true;
      scene.value.add(livingRoomLight);
      
      // 客厅柔光 - 装饰性光源
      const livingRoomAccentLight = new THREE.SpotLight(0xffe0a8, 0.7, 8, Math.PI / 6, 0.5, 1);
      livingRoomAccentLight.position.set(2, 2.5, 0);
      livingRoomAccentLight.target.position.set(2, 0, 0);
      scene.value.add(livingRoomAccentLight);
      scene.value.add(livingRoomAccentLight.target);
      
      // 主卧室 - 柔和的蓝紫色调
      const masterBedroomLight = new THREE.PointLight(0xb4c8ff, 0.7, 8);
      masterBedroomLight.position.set(-5, 2.0, -6);
      scene.value.add(masterBedroomLight);
      
      // 客卧 - 暖白色
      const guestBedroomLight = new THREE.PointLight(0xfff0dd, 0.7, 8);
      guestBedroomLight.position.set(5, 2.0, -6);
      scene.value.add(guestBedroomLight);
      
      // 客卧2 - 淡黄色调
      const bedroom2Light = new THREE.PointLight(0xffeedd, 0.7, 8);
      bedroom2Light.position.set(0, 2.0, -6);
      scene.value.add(bedroom2Light);
      
      // 添加电视背光效果
      const tvBacklight = new THREE.RectAreaLight(0x80a0ff, 2.0, 4, 1);
      tvBacklight.position.set(0, 1.0, -0.5);
      tvBacklight.lookAt(0, 1.0, 1);
      scene.value.add(tvBacklight);
      
      // 添加底部轮廓光效果
      const floorLight1 = new THREE.PointLight(0x6080ff, 0.5, 6);
      floorLight1.position.set(-4, 0.1, 0);
      scene.value.add(floorLight1);
      
      const floorLight2 = new THREE.PointLight(0xff8060, 0.5, 6);
      floorLight2.position.set(4, 0.1, 0);
      scene.value.add(floorLight2);
      
      // 添加随时间轻微变化的光效
      const subtleLight = new THREE.PointLight(0xffffaa, 0.3, 12);
      subtleLight.position.set(0, 3, -3);
      subtleLight.userData = { phase: 0 }; // 为动画添加相位
      scene.value.add(subtleLight);
    }
  }
}, { deep: true });

// Toggle animation visibility
const toggleAnimationVisibility = (show) => {
  showAnimation.value = show;
  
  connectionLines.value.forEach(connection => {
    if (connection.packets && connection.packets.length > 0) {
      connection.packets.forEach(packet => {
        packet.visible = show && connection.active;
      });
    }
  });
};

// Expose methods to parent components
defineExpose({
  toggleAnimationVisibility
});

// Lifecycle hooks
onMounted(async () => {
  // Initialize scene
  await initScene();
  
  // Start animation loop
  animate();
  
  // Handle window resize
  window.addEventListener('resize', onResize);
});

// Clean up on component unmount
onBeforeUnmount(() => {
  // Remove event listeners
  container.value.removeEventListener('mousemove', onMouseMove);
  container.value.removeEventListener('click', onMouseClick);
  window.removeEventListener('resize', onResize);
  
  // Dispose of Three.js resources
  connectionLines.value.forEach(line => {
    // Clean up main line
    scene.value.remove(line.mesh);
    line.mesh.geometry.dispose();
    line.mesh.material.dispose();
    
    // Clean up glow line
    scene.value.remove(line.glowMesh);
    line.glowMesh.geometry.dispose();
    line.glowMesh.material.dispose();
    
    // Clean up packet meshes
    if (line.packets && line.packets.length > 0) {
      line.packets.forEach(packet => {
        scene.value.remove(packet);
        packet.geometry.dispose();
        packet.material.dispose();
      });
    }
  });
  
  Object.values(deviceMeshes.value).forEach(mesh => {
    scene.value.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  
  renderer.value.dispose();
  labelRenderer.value.domElement.remove();
});

// Handle window resize
const onResize = () => {
  if (!camera.value || !renderer.value || !container.value) return;
  
  camera.value.aspect = container.value.clientWidth / container.value.clientHeight;
  camera.value.updateProjectionMatrix();
  
  renderer.value.setSize(container.value.clientWidth, container.value.clientHeight);
  labelRenderer.value.setSize(container.value.clientWidth, container.value.clientHeight);
};

// Helper function to create water ripple effect
const createWaterRipple = (device) => {
  // Create container group for all ripples
  const rippleGroup = new THREE.Group();
  
  // Get position from the device
  let devicePosition;
  if (device.userData && device.userData.isModel) {
    const box = new THREE.Box3().setFromObject(device);
    devicePosition = new THREE.Vector3();
    box.getCenter(devicePosition);
    // Move to bottom of device
    devicePosition.y = box.min.y;
  } else {
    devicePosition = device.position.clone();
    devicePosition.y = 0; // Place at ground level
  }
  
  // Position the ripple group
  rippleGroup.position.copy(devicePosition);
  
  // 特殊偏移: 将水波纹放置在客厅位置
  rippleGroup.position.z = -2.8;
  
  // Create multiple ripple rings with different sizes and speeds
  const rippleCount = 4;
  const rippleMeshes = [];
  
  // 定义波纹颜色渐变
  const colors = [
    new THREE.Color(0x00c8ff), // 亮蓝色
    new THREE.Color(0x0088ff), // 蓝色
    new THREE.Color(0x00ffea), // 青色
    new THREE.Color(0x80c0ff)  // 淡蓝色
  ];
  
  for (let i = 0; i < rippleCount; i++) {
    // Create ripple geometry - a flat ring
    const innerRadius = 0.3 + i * 0.15;
    const outerRadius = innerRadius + 0.1 + (i * 0.02);
    const rippleGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
    
    // Create ripple material with glow effect
    const rippleMaterial = new THREE.MeshPhongMaterial({
      color: colors[i % colors.length],
      emissive: colors[i % colors.length],
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.7 - (i * 0.1),
      side: THREE.DoubleSide,
      shininess: 80
    });
    
    // Create mesh and position it horizontally
    const rippleMesh = new THREE.Mesh(rippleGeometry, rippleMaterial);
    rippleMesh.rotation.x = -Math.PI / 2; // Rotate to be flat on ground
    rippleMesh.position.y = 0.02 + (i * 0.005); // Stagger height slightly to avoid z-fighting
    
    // Store animation parameters in userData
    rippleMesh.userData = {
      initialScale: 1.0,
      maxScale: 2.2 + i * 0.8,
      animationSpeed: 0.4 + i * 0.15, // Different speeds for each ripple
      animationOffset: i * (Math.PI / (rippleCount * 0.5)), // Phase offset
      initialOpacity: 0.7 - (i * 0.1), // Decreasing opacity for outer ripples
      colorIndex: i % colors.length,
      baseColor: colors[i % colors.length].clone()
    };
    
    rippleGroup.add(rippleMesh);
    rippleMeshes.push(rippleMesh);
  }
  
  // Add a central glow effect
  const glowGeometry = new THREE.CircleGeometry(0.4, 32);
  const glowMaterial = new THREE.MeshPhongMaterial({
    color: 0x00a0ff,
    emissive: 0x00a0ff,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.rotation.x = -Math.PI / 2;
  glowMesh.position.y = 0.03; // Slightly above rings
  glowMesh.userData = {
    pulsate: true
  };
  
  rippleGroup.add(glowMesh);
  
  // Store ripple meshes in the group's userData
  rippleGroup.userData = {
    ripples: rippleMeshes,
    centerGlow: glowMesh,
    deviceRef: device,
    colors: colors
  };
  
  return rippleGroup;
};
</script>

<style scoped>
/* Network Topology specific styling */
.network-topology-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.rendering-container {
  width: 100%;
  height: 100%;
}

/* Legend styling */
.topology-legend {
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-size: 14px;
  z-index: 100;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.legend-title {
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 5px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 8px 0;
}

.legend-line {
  width: 30px;
  height: 3px;
  margin-right: 10px;
}

.solid-line {
  background-color: #06d6a0;
  box-shadow: 0 0 5px rgba(6, 214, 160, 0.8);
}

.dashed-line {
  background: repeating-linear-gradient(
    to right,
    #06d6a0 0%,
    #06d6a0 50%,
    transparent 50%,
    transparent 100%
  );
  background-size: 8px 100%;
  box-shadow: 0 0 5px rgba(6, 214, 160, 0.8);
}

.fiber-line {
  background-color: #ffd700;
  box-shadow: 0 0 5px rgba(255, 215, 0, 0.8);
}

.legend-text {
  font-size: 14px;
}

/* Tooltip styles */
.tooltip {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  max-width: 280px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
  transform: translate(15px, -50%);
}

.tooltip-title {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 16px;
  color: #fff;
}

.tooltip-status {
  margin-bottom: 5px;
  font-size: 14px;
}

.status-online {
  color: #06d6a0;
  font-weight: bold;
}

.status-idle {
  color: #ffb703;
  font-weight: bold;
}

.status-offline {
  color: #ef476f;
  font-weight: bold;
}

.tooltip-details {
  font-size: 13px;
  color: #ccc;
}

:deep(.room-label) {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

:deep(.device-label) {
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

:deep(.fttr-title-container) {
  width: 400px;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
}

:deep(.fttr-title) {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
  padding: 8px 16px;
  color: #ffffff;
  background: linear-gradient(135deg, rgba(0, 83, 151, 0.8), rgba(0, 158, 198, 0.8));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: glow 3s ease-in-out infinite alternate;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

:deep(.title-part) {
  opacity: 0;
  transform: translateY(10px);
  animation: fadeIn 0.8s ease-out forwards;
  white-space: nowrap;
  margin: 3px 0;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glow {
  from {
    box-shadow: 0 0 10px rgba(32, 156, 238, 0.5);
  }
  to {
    box-shadow: 0 0 20px rgba(32, 156, 238, 0.8), 0 0 30px rgba(32, 156, 238, 0.4);
  }
}

/* Debug panel styles */
.debug-panel {
  position: absolute;
  right: 10px;
  top: 10px;
  background-color: rgba(20, 20, 20, 0.9);
  border-radius: 8px;
  padding: 15px;
  width: 300px;
  color: white;
  z-index: 1000;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 10px;
}

.debug-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.debug-content {
  max-height: 70vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group select,
.form-group input {
  background-color: rgba(60, 60, 60, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 8px;
  border-radius: 4px;
  width: 100%;
  margin-bottom: 5px;
}

.form-group input[type="range"] {
  width: 70%;
  display: inline-block;
}

.form-group input[type="number"] {
  width: 25%;
  display: inline-block;
  margin-left: 5%;
}

.debug-content h4 {
  font-size: 16px;
  margin: 15px 0 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 5px;
}

.reset-btn, .apply-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  margin-right: 10px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 15px;
}

.reset-btn {
  background: #6c757d;
  color: white;
}

.apply-btn {
  background: #0d6efd;
  color: white;
}

.debug-toggle-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background: rgba(30, 30, 30, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  z-index: 100;
}
</style> 