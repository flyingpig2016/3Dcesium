import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useNetworkStore = defineStore('network', () => {
  // 连接线类型定义
  const CONNECTION_TYPES = {
    SOLID: 'solid',     // 实线
    DASHED: 'dashed',   // 虚线
    FIBER: 'fiber'      // 光纤线(黄色)
  };

  // State
  const devices = ref([
    {
      id: 'tv1',
      name: '客厅电视',
      type: 'tv',
      status: 'online',
      active: true,
      connections: [{target: 'stb1', lineType: CONNECTION_TYPES.SOLID}],
      position: { x: -6, y: .3, z: 0 }
    },
    {
      id: 'tv2',
      name: '主卧电脑',
      type: 'livingcomputer',
      status: 'idle',
      active: true,
      connections: [{target: 'fttr', lineType: CONNECTION_TYPES.FIBER}],
      position: { x: -7, y: 1, z: -6 }
    },
    {
      id: 'stb1',
      name: '机顶盒',
      type: 'stb',
      status: 'online',
      active: true,
      connections: [{target: 'fttr', lineType: CONNECTION_TYPES.FIBER}, {target: 'tv1', lineType: CONNECTION_TYPES.SOLID}],
      position: { x: -5.5, y: .3, z: -2.2 }
    },
    {
      id: 'print2',
      name: '打印机',
      type: 'print',
      status: 'offline',
      active: true,
      connections: [{target: 'fttr', lineType: CONNECTION_TYPES.FIBER}],
      position: { x: 6, y: 0, z: -1 }
    },
    {
      id: 'ac1',
      name: '客厅空调',
      type: 'ac',
      status: 'online',
      active: true,
      connections: [{target: 'router1', lineType: CONNECTION_TYPES.DASHED}],
      position: { x: 6, y: 2, z: -3.5 }
    },
    {
      id: 'ac2',
      name: '客卧空调1',
      type: 'ac',
      status: 'online',
      active: true,
      connections: [{target: 'router1', lineType: CONNECTION_TYPES.DASHED}],
      position: { x: 0, y: 2, z: -8.5 }
    },
    {
      id: 'ac3',
      name: '客卧空调2',
      type: 'ac',
      status: 'offline',
      active: true,
      connections: [{target: 'router1', lineType: CONNECTION_TYPES.DASHED}],
      position: { x: 5, y: 2, z: -8.5 }
    },
    {
      id: 'pc1',
      name: '客卧电脑',
      type: 'pc',
      status: 'online',
      active: true,
      connections: [{target: 'router1', lineType: CONNECTION_TYPES.DASHED}],
      position: { x: 5, y: 0.3, z: -8 }
    },
    {
      id: 'security_camera1',
      name: '监控摄像头',
      type: 'security_camera',
      status: 'online',
      active: true,
      connections: [{target: 'fttr', lineType: CONNECTION_TYPES.FIBER}],
      position: { x: -1, y: 2.2, z: -2.5 }
    },
    {
      id: 'light1',
      name: '客厅灯',
      type: 'light',
      status: 'online',
      active: true,
      connections: [{target: 'router1', lineType: CONNECTION_TYPES.DASHED}],
      position: { x: 0, y: 0.3, z: 2 }
    },
    {
      id: 'vacuum1',
      name: '智能扫地机器人',
      type: 'vacuum',
      status: 'online',
      active: true,
      connections: [{target: 'router1', lineType: CONNECTION_TYPES.DASHED}],
      position: { x: 3, y: 0.1, z: -2 }
    },
    {
      id: 'router1',
      name: '路由器',
      type: 'router',
      status: 'online',
      active: true,
      connections: [{target: 'fttr', lineType: CONNECTION_TYPES.FIBER}],
      position: { x: 1, y: -2, z: -6.5 }
    },
    {
      id: 'fttr2',
      name: 'FTTR从光猫',
      type: 'fttr',
      status: 'online',
      active: true,
      connections: [{target: 'fttr', lineType: CONNECTION_TYPES.FIBER}],
      position: { x: 3, y: 5, z: -4 }
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
    CONNECTION_TYPES,
    devices,
    connectedDevices,
    activeConnections,
    toggleDeviceStatus,
    toggleDeviceActive
  };
}); 