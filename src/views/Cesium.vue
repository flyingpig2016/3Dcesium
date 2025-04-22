<template>
  <div class="cesium-view">
    <div id="cesiumContainer"></div>
    <div class="control-panel">
      <p>{{ status }}</p>
      <div class="button-group">
        <button @click="startAnimation" :disabled="points.length < 2 || isAnimating">开始动画</button>
        <button @click="clearPath" :disabled="isAnimating">清除路径</button>
      </div>
      
      <div class="coordinate-input">
        <h4>手动添加坐标点</h4>
        <div class="input-group">
          <label>经度:</label>
          <input type="number" v-model="manualLongitude" placeholder="116.4074" step="0.0001" />
        </div>
        <div class="input-group">
          <label>纬度:</label>
          <input type="number" v-model="manualLatitude" placeholder="39.9042" step="0.0001" />
        </div>
        <div class="input-group">
          <label>高度(米):</label>
          <input type="number" v-model="manualHeight" placeholder="0" />
        </div>
        <button @click="addManualPoint" :disabled="isAnimating">添加坐标点</button>
      </div>
      
      <div class="model-selector">
        <span>选择模型:</span>
        <select v-model="selectedModel">
          <option v-for="option in modelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
      
      <div class="points-list" v-if="points.length > 0">
        <h4>当前路径点 ({{ points.length }})</h4>
        <div class="point-item" v-for="(point, index) in displayPoints" :key="index">
          <span>点 {{ index + 1 }}: {{ point }}</span>
          <button @click="removePoint(index)" :disabled="isAnimating" class="small-button">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const status = ref('初始化中...');
let viewer = null;

// 路径相关状态

// 天安门西：116.397879,39.91384
// 国贸：116.466419,39.914117
const points = ref([]);
const pointEntities = ref([]);
const path = ref(null);
const modelEntity = ref(null);
const isAnimating = ref(false);
const selectedModel = ref('none');

// 手动输入坐标
const manualLongitude = ref(116.4074);
const manualLatitude = ref(39.9042);
const manualHeight = ref(0);

// 显示的坐标点
const displayPoints = computed(() => {
  return points.value.map((point, index) => {
    // 将Cartesian3坐标转换为经纬度
    const cartographic = Cesium.Cartographic.fromCartesian(point.position);
    const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
    const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
    const height = cartographic.height.toFixed(1);
    return `经度:${lon}, 纬度:${lat}, 高度:${height}m`;
  });
});

// 模型定义
const models = {
  none: null, // 使用点实体
  vehicle: {
    uri: './assets/models/vehicle/vehicle.glb',
    scale: 20.0,
    minimumPixelSize: 64
  },
  airplane: {
    uri: './assets/models/Cesium_Air.glb',
    scale: 2.0,
    minimumPixelSize: 80
  },
};

// 更新模型选择器选项
const modelOptions = [
  { value: 'none', label: '无模型（使用点实体）' },
  { value: 'vehicle', label: '本地车辆模型' },
  { value: 'airplane', label: '本地飞机模型' },
  { value: 'online_airplane', label: '在线飞机模型' },
  { value: 'online_car', label: '在线车辆模型' }
];

onMounted(() => {
  try {
    status.value = '正在创建Cesium...';
    
    // 设置token
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjODM5M2UyMi1hNTkwLTQ4MDItYWM1Zi1iNjg3ZTlmOTM3NmEiLCJpZCI6Mjk1MjA2LCJpYXQiOjE3NDUzMTAxNDV9._K0lC9TkO9Wgola2MriEKWDTG6ixpxXs6fDfWq1hOFA';
    
    // 创建viewer
    viewer = new Cesium.Viewer('cesiumContainer', {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      shadows: false
    });
    
    console.log('Cesium创建成功');
    status.value = '点击地图或手动输入添加路径点';
    
    // 添加点击事件处理
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction(handleMapClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  } catch (error) {
    console.error('Cesium初始化错误:', error);
    status.value = '初始化失败: ' + error.message;
  }
});

onUnmounted(() => {
  if (viewer) {
    try {
      viewer.destroy();
    } catch (error) {
      console.error('销毁Cesium时出错:', error);
    }
  }
});

// 处理地图点击事件
const handleMapClick = (event) => {
  if (isAnimating.value) return;
  
  try {
    // 尝试不同方法获取点击位置
    let cartesian = null;
    
    // 方法1: 使用场景拾取
    if (viewer.scene.pickPositionSupported) {
      cartesian = viewer.scene.pickPosition(event.position);
    }
    
    // 方法2: 使用椭球体拾取
    if (!Cesium.defined(cartesian)) {
      cartesian = viewer.camera.pickEllipsoid(
        event.position,
        viewer.scene.globe.ellipsoid
      );
    }
    
    if (!Cesium.defined(cartesian)) {
      console.warn('无法获取点击位置');
      return;
    }
    
    addPointToPath(cartesian);
  } catch (error) {
    console.error('处理点击事件出错:', error);
  }
};

// 添加手动输入的坐标点
const addManualPoint = () => {
  if (isAnimating.value) return;
  
  try {
    // 验证输入
    if (!manualLongitude.value || !manualLatitude.value) {
      status.value = '请输入有效的经纬度坐标';
      return;
    }
    
    // 将经纬度转换为Cartesian3坐标
    const cartesian = Cesium.Cartesian3.fromDegrees(
      Number(manualLongitude.value),
      Number(manualLatitude.value),
      Number(manualHeight.value) || 0
    );
    
    addPointToPath(cartesian);
    
    // 将视图移动到新添加的点
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        Number(manualLongitude.value),
        Number(manualLatitude.value),
        Number(manualHeight.value) + 10000
      )
    });
  } catch (error) {
    console.error('添加手动坐标点出错:', error);
    status.value = '添加坐标点失败: ' + error.message;
  }
};

// 添加点到路径
const addPointToPath = (cartesian) => {
  // 记录点位
  points.value.push({
    position: cartesian,
    time: Cesium.JulianDate.now()
  });
  
  // 创建点实体
  const pointEntity = viewer.entities.add({
    position: cartesian,
    point: {
      pixelSize: 10,
      color: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2
    }
  });
  
  pointEntities.value.push(pointEntity);
  status.value = `已添加 ${points.value.length} 个点`;
  
  // 如果有至少两个点，绘制路径
  if (points.value.length >= 2) {
    drawPath();
  }
};

// 删除指定索引的点
const removePoint = (index) => {
  if (isAnimating.value) return;
  
  try {
    // 移除对应的点实体
    viewer.entities.remove(pointEntities.value[index]);
    
    // 从数组中移除
    points.value.splice(index, 1);
    pointEntities.value.splice(index, 1);
    
    status.value = points.value.length > 0 
      ? `已剩余 ${points.value.length} 个点` 
      : '所有点已清除，点击地图添加新点';
    
    // 如果还有至少两个点，重新绘制路径
    if (points.value.length >= 2) {
      drawPath();
    } else if (path.value) {
      // 如果点不足，移除路径
      viewer.entities.remove(path.value);
      path.value = null;
    }
  } catch (error) {
    console.error('删除点出错:', error);
  }
};

// 绘制路径
const drawPath = () => {
  try {
    // 删除旧路径
    if (path.value) {
      viewer.entities.remove(path.value);
    }
    
    // 创建新路径
    path.value = viewer.entities.add({
      polyline: {
        positions: points.value.map(p => p.position),
        width: 3,
        material: Cesium.Color.BLUE,
        clampToGround: false
      }
    });
  } catch (error) {
    console.error('绘制路径出错:', error);
  }
};

// 开始动画
const startAnimation = () => {
  if (points.value.length < 2 || isAnimating.value) return;
  
  try {
    isAnimating.value = true;
    status.value = '动画进行中...';
    
    // 创建时间序列
    const startTime = Cesium.JulianDate.now();
    const stopTime = Cesium.JulianDate.addSeconds(
      startTime, 
      points.value.length * 3, 
      new Cesium.JulianDate()
    );
    
    // 配置时钟
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 1;
    
    // 创建位置属性
    const position = new Cesium.SampledPositionProperty();
    
    // 添加每个点位的位置和时间
    for (let i = 0; i < points.value.length; i++) {
      const time = Cesium.JulianDate.addSeconds(
        startTime, 
        i * 3, 
        new Cesium.JulianDate()
      );
      position.addSample(time, points.value[i].position);
    }
    
    // 删除旧模型
    if (modelEntity.value) {
      viewer.entities.remove(modelEntity.value);
    }
    
    // 根据选择的模型类型创建实体
    if (selectedModel.value === 'none' || !models[selectedModel.value]) {
      // 使用点实体
      modelEntity.value = viewer.entities.add({
        position: position,
        point: {
          pixelSize: 15,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        },
        path: {
          resolution: 1,
          material: Cesium.Color.YELLOW,
          width: 3
        }
      });
      status.value = '点实体动画进行中...';
    } else {
      // 使用3D模型
      try {
        console.log(`尝试加载模型: ${selectedModel.value}`);
        const modelConfig = models[selectedModel.value];
        
        modelEntity.value = viewer.entities.add({
          position: position,
          orientation: new Cesium.VelocityOrientationProperty(position),
          model: {
            uri: modelConfig.uri,
            scale: modelConfig.scale,
            minimumPixelSize: modelConfig.minimumPixelSize,
            maximumScale: 20000
          },
          path: {
            resolution: 1,
            material: Cesium.Color.YELLOW,
            width: 3
          }
        });
        
        status.value = '3D模型动画进行中...';
        console.log('模型加载请求已发送');
      } catch (error) {
        console.warn('3D模型加载失败, 使用点实体替代:', error);
        
        // 回退到点实体
        modelEntity.value = viewer.entities.add({
          position: position,
          point: {
            pixelSize: 15,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          },
          path: {
            resolution: 1,
            material: Cesium.Color.YELLOW,
            width: 3
          }
        });
        
        status.value = '点实体动画进行中(模型加载失败)...';
      }
    }
    
    // 跟踪模型
    viewer.trackedEntity = modelEntity.value;
    
    // 启动时钟
    viewer.clock.shouldAnimate = true;
  } catch (error) {
    console.error('启动动画出错:', error);
    isAnimating.value = false;
    status.value = '动画启动失败';
  }
};

// 清除路径
const clearPath = () => {
  if (isAnimating.value) return;
  
  try {
    // 清除所有点实体
    for (const entity of pointEntities.value) {
      viewer.entities.remove(entity);
    }
    
    // 清除路径
    if (path.value) {
      viewer.entities.remove(path.value);
    }
    
    // 清除模型
    if (modelEntity.value) {
      viewer.entities.remove(modelEntity.value);
    }
    
    // 重置状态
    points.value = [];
    pointEntities.value = [];
    path.value = null;
    modelEntity.value = null;
    viewer.trackedEntity = undefined;
    
    status.value = '路径已清除，点击地图添加新点';
  } catch (error) {
    console.error('清除路径出错:', error);
  }
};
</script>

<style>
.cesium-view {
  position: relative;
  width: 100%;
  height: 100%;
}

#cesiumContainer {
  width: 100%;
  height: 100vh;
}

.control-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 999;
  background: rgba(42, 42, 42, 0.8);
  padding: 10px;
  border-radius: 4px;
  color: white;
  max-height: 90vh;
  overflow-y: auto;
  width: 300px;
}

.control-panel h4 {
  margin: 10px 0 5px 0;
  border-bottom: 1px solid #666;
  padding-bottom: 5px;
}

.button-group {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}

.control-panel button {
  margin: 5px 0;
  padding: 8px 15px;
  background: #2b9af3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.control-panel button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.coordinate-input {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.input-group label {
  width: 80px;
  font-size: 14px;
}

.input-group input {
  flex: 1;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #666;
  background: #333;
  color: white;
}

.model-selector {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
}

.model-selector select {
  margin-top: 5px;
  padding: 5px;
  border-radius: 4px;
  background: #444;
  color: white;
  border: 1px solid #666;
}

.points-list {
  margin-top: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #555;
  font-size: 12px;
}

.small-button {
  padding: 3px 8px !important;
  font-size: 12px;
  margin-left: 5px !important;
  background: #e74c3c !important;
}
</style>