<template>
  <div class="dashboard">
    <header class="dashboard-header glass-panel">
      <h1>智能家庭网络拓扑</h1>
      <div class="controls">
        <button class="btn btn-primary toggle-mode" @click="toggleDarkMode">
          <span v-if="darkMode">Light Mode</span>
          <span v-else>Dark Mode</span>
        </button>
      </div>
    </header>

    <div class="main-content">
      <!-- 3D Visualization Container -->
      <NetworkTopology 
        :dark-mode="darkMode" 
        @device-selected="selectDevice"
      />

      <!-- Side Panel -->
      <aside class="side-panel glass-panel">
        <h2>拓扑统计</h2>
        <div class="stats-container">
          <div class="stat-item">
            <span class="stat-label">连接设备</span>
            <span class="stat-value">{{ connectedDevices }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">活跃连接</span>
            <span class="stat-value">{{ activeConnections }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">网络负载</span>
            <div class="progress-bar">
              <div class="progress" :style="{ width: networkLoad + '%', backgroundColor: loadColor }"></div>
            </div>
            <span class="stat-value">{{ networkLoad }}%</span>
          </div>
        </div>

        <h2>设备列表</h2>
        <div class="device-list">
          <div 
            v-for="device in devices" 
            :key="device.id" 
            class="device-item"
            :class="{ 
              active: device.active, 
              selected: selectedDevice === device.id 
            }"
            @click="selectDevice(device.id)"
          >
            <span class="device-icon" :class="device.type"></span>
            <div class="device-info">
              <span class="device-name">{{ device.name }}</span>
              <span class="device-type">{{ formatDeviceType(device.type) }}</span>
            </div>
            <span class="device-status" :class="device.status"></span>
          </div>
        </div>

        <div v-if="selectedDevice" class="device-details glass-panel">
          <h3>Device Details</h3>
          <div class="detail-row">
            <span class="detail-label">Name</span>
            <span class="detail-value">{{ selectedDeviceInfo.name }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Type</span>
            <span class="detail-value">{{ formatDeviceType(selectedDeviceInfo.type) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value status" :class="selectedDeviceInfo.status">
              {{ selectedDeviceInfo.status }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Activity</span>
            <span class="toggle-switch">
              <input 
                type="checkbox" 
                :id="'toggle-' + selectedDevice" 
                :checked="selectedDeviceInfo.active" 
                @change="toggleDeviceActive(selectedDevice)" 
              />
              <label :for="'toggle-' + selectedDevice"></label>
            </span>
          </div>
          <div class="device-actions">
            <button class="btn btn-primary" @click="toggleDeviceStatus(selectedDevice)">
              Change Status
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNetworkStore } from '../stores/network';
import NetworkTopology from '../components/3d/NetworkTopology.vue';

// Store
const networkStore = useNetworkStore();
const { 
  devices, 
  connectedDevices, 
  activeConnections, 
  toggleDeviceStatus, 
  toggleDeviceActive 
} = networkStore;

// State
const darkMode = ref(true);
const networkLoad = ref(65);
const selectedDevice = ref(null);

// Computed properties
const loadColor = computed(() => {
  if (networkLoad.value < 30) return 'var(--success)';
  if (networkLoad.value < 70) return 'var(--warning)';
  return 'var(--danger)';
});

const selectedDeviceInfo = computed(() => {
  if (!selectedDevice.value) return {};
  return devices.value.find(d => d.id === selectedDevice.value) || {};
});

// Methods
const toggleDarkMode = () => {
  darkMode.value = !darkMode.value;
  document.body.classList.toggle('light-mode');
};

const selectDevice = (deviceId) => {
  selectedDevice.value = deviceId;
};

const formatDeviceType = (type) => {
  switch (type) {
    case 'tv': return 'Television';
    case 'speaker': return 'Smart Speaker';
    case 'ac': return 'Air Conditioner';
    case 'pc': return 'Computer';
    case 'light': return 'Smart Light';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

// Simulate network load fluctuations
const simulateNetworkLoad = () => {
  const baseLoad = 45;
  const randomFactor = Math.random() * 40 - 20; // -20 to +20
  networkLoad.value = Math.max(5, Math.min(95, baseLoad + randomFactor));
  
  setTimeout(simulateNetworkLoad, 5000); // Update every 5 seconds
};

// Lifecycle hooks
onMounted(() => {
  // Start simulation
  simulateNetworkLoad();
  
  // Apply dark mode to body
  if (darkMode.value) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.add('light-mode');
  }
});
</script>

<style scoped>
.dashboard {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-width: 100%;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  margin: 0.5rem;
  height: 60px;
}

.main-content {
  flex: 1;
  display: flex;
  position: relative;
  height: calc(100vh - 70px);
  width: 100%;
  overflow: hidden;
}

.side-panel {
  width: 300px;
  height: calc(100vh - 70px);
  margin: 0 0.5rem 0.5rem 0;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

h2 {
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.5rem;
}

h3 {
  font-size: 1rem;
  margin: 0 0 1rem 0;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.5rem;
}

.stats-container {
  margin-bottom: 0.5rem;
}

.stat-item {
  margin-bottom: 1rem;
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  opacity: 0.8;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin: 0.5rem 0;
}

.progress {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.device-item {
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.device-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.device-item.active {
  border-left-color: var(--secondary-color);
}

.device-item.selected {
  background: rgba(58, 134, 255, 0.15);
  border-left-color: var(--primary-color);
}

.device-icon {
  width: 24px;
  height: 24px;
  margin-right: 0.75rem;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  flex-shrink: 0;
}

.device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.device-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.device-type {
  font-size: 0.75rem;
  opacity: 0.7;
}

.device-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.device-status.online {
  background-color: var(--success);
}

.device-status.offline {
  background-color: var(--danger);
}

.device-status.idle {
  background-color: var(--warning);
}

.device-details {
  padding: 1rem;
  margin-top: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.detail-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.detail-value {
  font-weight: 500;
}

.status.online {
  color: var(--success);
}

.status.offline {
  color: var(--danger);
}

.status.idle {
  color: var(--warning);
}

.device-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  transition: 0.4s;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: var(--primary-color);
}

.toggle-switch input:checked + label:before {
  transform: translateX(22px);
}

/* Device icon classes */
.tv {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233a86ff'%3E%3Cpath d='M20 6h-5.5l2.04-2.04a1 1 0 1 0-1.41-1.41L12 5.68 8.88 2.54a1 1 0 0 0-1.41 1.41L9.5 6H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm0 13H4V8h16v11z'/%3E%3C/svg%3E");
}

.speaker {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fb5607'%3E%3Cpath d='M12 3a9 9 0 0 0-9 9h6c0-1.66 1.34-3 3-3s3 1.34 3 3h6c0-4.97-4.03-9-9-9zm0 8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-9 9h18v-2H3v2z'/%3E%3C/svg%3E");
}

.ac {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2380ffdb'%3E%3Cpath d='M22 11h-4.17l3.24-3.24-1.41-1.41L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.41L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z'/%3E%3C/svg%3E");
}

.pc {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d100d1'%3E%3Cpath d='M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z'/%3E%3C/svg%3E");
}

.light {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffd166'%3E%3Cpath d='M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z'/%3E%3C/svg%3E");
}
</style> 