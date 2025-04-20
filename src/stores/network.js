import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useNetworkStore = defineStore('network', () => {
  // State
  const devices = ref([
    {
      id: 'tv1',
      name: '客厅电视',
      type: 'tv',
      status: 'online',
      active: true,
      connections: ['fttr'],
      position: { x: -6, y: .3, z: 0 }
    },
    {
      id: 'tv2',
      name: '主卧电脑',
      type: 'livingcomputer',
      status: 'idle',
      active: false,
      connections: ['fttr'],
      position: { x: -7, y: 1, z: -6 }
    },
    {
      id: 'speaker1',
      name: '客厅音箱',
      type: 'speaker',
      status: 'online',
      active: true,
      connections: ['fttr', 'tv1'],
      position: { x: -6, y: 0.3, z: -3 }
    },
    {
      id: 'speaker2',
      name: '主卧音箱',
      type: 'speaker',
      status: 'offline',
      active: false,
      connections: ['fttr'],
      position: { x: -5, y: 0.3, z: -6 }
    },
    {
      id: 'ac1',
      name: '客厅空调',
      type: 'ac',
      status: 'online',
      active: true,
      connections: ['fttr'],
      position: { x: 6, y: 2, z: -3.5 }
    },
    {
      id: 'ac2',
      name: '客卧空调',
      type: 'ac',
      status: 'online',
      active: false,
      connections: ['fttr'],
      position: { x: 0, y: 2, z: -8.5 }
    },
    {
      id: 'ac3',
      name: '客卧空调',
      type: 'ac',
      status: 'offline',
      active: false,
      connections: ['fttr'],
      position: { x: 5, y: 2, z: -8.5 }
    },
    {
      id: 'pc1',
      name: '工作电脑',
      type: 'pc',
      status: 'online',
      active: true,
      connections: ['fttr'],
      position: { x: 5, y: 0.3, z: -5.5 }
    },
    {
      id: 'light1',
      name: '客厅灯',
      type: 'light',
      status: 'online',
      active: true,
      connections: ['fttr'],
      position: { x: 0, y: 0.3, z: 2 }
    },
    // {
    //   id: 'light2',
    //   name: '厨房灯',
    //   type: 'light',
    //   status: 'online',
    //   active: true,
    //   connections: ['fttr'],
    //   position: { x: -2, y: 0.3, z: 2 }
    // },
    // {
    //   id: 'light3',
    //   name: '主卧灯',
    //   type: 'light',
    //   status: 'offline',
    //   active: false,
    //   connections: ['fttr'],
    //   position: { x: -5, y: 0.3, z: -3 }
    // },
    // {
    //   id: 'light4',
    //   name: '客卧灯',
    //   type: 'light',
    //   status: 'online',
    //   active: false,
    //   connections: ['fttr'],
    //   position: { x: 6, y: 0.3, z: -5 }
    // },
    {
      id: 'vacuum1',
      name: '智能扫地机器人',
      type: 'vacuum',
      status: 'online',
      active: true,
      connections: ['fttr'],
      position: { x: 1, y: 0.1, z: -3 }
    }
  ]);

  // Computed properties
  const connectedDevices = computed(() => {
    return devices.value.filter(device => device.status !== 'offline').length;
  });

  const activeConnections = computed(() => {
    return devices.value.filter(device => device.active).length;
  });

  // Actions
  const toggleDeviceStatus = (deviceId) => {
    const device = devices.value.find(d => d.id === deviceId);
    if (device) {
      if (device.status === 'offline') {
        device.status = 'online';
      } else if (device.status === 'online') {
        device.status = 'idle';
      } else {
        device.status = 'offline';
      }
    }
  };

  const toggleDeviceActive = (deviceId) => {
    const device = devices.value.find(d => d.id === deviceId);
    if (device) {
      device.active = !device.active;
    }
  };

  return {
    devices,
    connectedDevices,
    activeConnections,
    toggleDeviceStatus,
    toggleDeviceActive
  };
}); 