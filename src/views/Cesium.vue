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
          <label>经纬度:</label>
          <input type="text" v-model="combinedCoordinates" placeholder="116.4074,39.9042" />
        </div>
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
      
      <div class="animation-settings">
        <h4>动画设置</h4>
        <div class="input-group">
          <label>速度:</label>
          <input type="range" v-model="animationSpeed" min="0.1" max="5" step="0.1" />
          <span>{{ animationSpeed }}x</span>
        </div>
        <div class="input-group">
          <label>线宽:</label>
          <input type="range" v-model="lineWidth" min="1" max="10" step="1" />
          <span>{{ lineWidth }}px</span>
        </div>
        <div class="input-group">
          <label>线颜色:</label>
          <select v-model="lineColor">
            <option value="RED">红色</option>
            <option value="GREEN">绿色</option>
            <option value="BLUE">蓝色</option>
            <option value="YELLOW">黄色</option>
            <option value="CYAN">青色</option>
            <option value="MAGENTA">品红</option>
            <option value="WHITE">白色</option>
          </select>
        </div>
        <div class="input-group">
          <label>模型:</label>
          <select v-model="selectedModel">
            <option v-for="option in modelOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="points-list" v-if="points.length > 0">
        <h4>当前路径点 ({{ points.length }})</h4>
        <div class="point-item" v-for="(point, index) in displayPoints" :key="index">
          <span>点 {{ index + 1 }}: {{ point }}</span>
          <button  @click="removePoint(index)" :disabled="isAnimating" class="small-button">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
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
const animationPath = ref(null);
const isAnimating = ref(false);

// 模型相关
const modelOptions = [
  { value: 'car', label: '小汽车' },
  { value: 'airplane', label: '飞机' },
  { value: 'point', label: '点标记' }
];
const selectedModel = ref('car');

// 手动输入坐标
const manualLongitude = ref(116.4074);
const manualLatitude = ref(39.9042);
const manualHeight = ref(0);
const combinedCoordinates = ref('');

// 动画设置
const animationSpeed = ref(1.0);
const lineWidth = ref(5);
const lineColor = ref('BLUE');

// 动画控制变量
let animationCancel = null;
let currentPointIndex = 0;

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
    
    // 添加默认点位：天安门西和国贸
    setTimeout(() => {
      // 添加天安门西
      const tiananmenWest = Cesium.Cartesian3.fromDegrees(116.3833, 39.9062, 0);
      addPointToPath(tiananmenWest);
      
      // 添加国贸
      const chinaWorld = Cesium.Cartesian3.fromDegrees(116.4560, 39.9071, 0);
      addPointToPath(chinaWorld);
      
      // 调整视图以显示这两点
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(
          116.3833, 39.9062,
          116.4560, 39.9071
        )
      });
    }, 1000); // 延迟1秒添加，确保地图已完全加载
  } catch (error) {
    console.error('Cesium初始化错误:', error);
    status.value = '初始化失败: ' + error.message;
  }
});

onUnmounted(() => {
  // 如果动画正在进行，停止动画
  stopAnimation();
  
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

// 解析组合的经纬度坐标
const parseCoordinates = () => {
  if (!combinedCoordinates.value) return;
  
  try {
    const parts = combinedCoordinates.value.split(',');
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0].trim());
      const lat = parseFloat(parts[1].trim());
      
      if (!isNaN(lon) && !isNaN(lat)) {
        manualLongitude.value = lon;
        manualLatitude.value = lat;
        status.value = '经纬度解析成功';
      } else {
        status.value = '无法解析经纬度值';
      }
    } else {
      status.value = '请使用逗号分隔经度和纬度';
    }
  } catch (error) {
    console.error('解析经纬度出错:', error);
    status.value = '解析经纬度出错';
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
        width: Number(lineWidth.value),
        material: Cesium.Color[lineColor.value],
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
    
    // 计算总距离以确定动画时间
    let totalDistance = 0;
    for (let i = 0; i < points.value.length - 1; i++) {
      totalDistance += Cesium.Cartesian3.distance(
        points.value[i].position, 
        points.value[i + 1].position
      );
    }
    
    // 基于总距离和速度计算总时间（秒）
    const totalDuration = totalDistance / 100 / Number(animationSpeed.value);
    
    const stopTime = Cesium.JulianDate.addSeconds(
      startTime, 
      totalDuration, 
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
    let currentTime = startTime.clone();
    position.addSample(currentTime, points.value[0].position);
    
    for (let i = 1; i < points.value.length; i++) {
      // 计算当前段的距离
      const segmentDistance = Cesium.Cartesian3.distance(
        points.value[i-1].position, 
        points.value[i].position
      );
      
      // 基于距离计算时间增量
      const timeIncrement = segmentDistance / totalDistance * totalDuration;
      
      // 更新时间
      currentTime = Cesium.JulianDate.addSeconds(
        currentTime,
        timeIncrement,
        new Cesium.JulianDate()
      );
      
      // 添加位置
      const elevatedPosition = addHeightToPosition(points.value[i].position, 20);
      position.addSample(currentTime, elevatedPosition);
    }
    
    // 隐藏静态路径
    if (path.value) {
      path.value.polyline.show = false;
    }
    
    // 删除旧的动画路径
    if (animationPath.value) {
      viewer.entities.remove(animationPath.value);
    }
    
    // 创建可跟踪的3D模型实体
    let modelUri;
    let modelScale;
    let modelMinPixelSize;
    
    switch (selectedModel.value) {
      case 'car':
        modelUri = 'https://sandcastle.cesium.com/SampleData/models/CesiumGround/Cesium_Ground_Vehicle.glb';
        modelScale = 5.0;
        modelMinPixelSize = 64;
        break;
      case 'airplane':
        modelUri = 'https://sandcastle.cesium.com/SampleData/models/CesiumAir/Cesium_Air.glb';
        modelScale = 5.0;
        modelMinPixelSize = 64;
        break;
      case 'point':
      default:
        // 默认使用点
        modelUri = null;
        break;
    }
    
    console.log("选择的模型:", selectedModel.value, "模型URI:", modelUri);
    
    // 创建一个动态路径
    animationPath.value = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty((time) => {
          // 获取当前时间已经走过的路径
          if (!time) return [];
          
          const startPosition = position.getValue(startTime);
          if (!startPosition) return [startPosition];
          
          const currentPosition = position.getValue(time);
          if (!currentPosition) return [startPosition];
          
          // 获取动画开始到当前的所有点
          const positions = [];
          let t = Cesium.JulianDate.clone(startTime);
          
          while (Cesium.JulianDate.lessThanOrEquals(t, time)) {
            const pos = position.getValue(t);
            if (pos) positions.push(pos);
            
            t = Cesium.JulianDate.addSeconds(t, 0.5, new Cesium.JulianDate());
          }
          
          if (positions.length < 2) positions.push(currentPosition);
          
          return positions;
        }, false),
        width: Number(lineWidth.value) + 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString('#FF4500').withAlpha(1.0), 
          dashLength: 8.0,
          dashPattern: 16
        }),
        clampToGround: false
      }
    });
    
    // 创建模型实体
    const trackedEntity = viewer.entities.add({
      id: 'trackedPosition',
      name: 'Current Position',
      position: position,
      orientation: new Cesium.VelocityOrientationProperty(position),
      path: {
        resolution: 1,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: Cesium.Color.CYAN.withAlpha(0.8)
        }),
        width: 3,
        leadTime: 0,
        trailTime: totalDuration // 显示整个路径
      }
    });
    
    // 根据选择添加模型或点实体
    if (selectedModel.value !== 'point' && modelUri) {
      // 添加模型
      trackedEntity.model = {
        uri: modelUri,
        scale: modelScale,
        minimumPixelSize: modelMinPixelSize,
        maximumScale: 20000,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
      };
      
      // 记录模型加载状态
      console.log(`正在加载3D模型: ${modelUri}`);
    } else {
      // 使用点实体
      trackedEntity.point = {
        pixelSize: 15,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      };
    }
    
    // 跟踪模型
    viewer.trackedEntity = trackedEntity;
    
    // 启动时钟
    viewer.clock.shouldAnimate = true;
    
    // 监听时钟事件
    const removeClockListener = viewer.clock.onTick.addEventListener((clock) => {
      const elapsedSeconds = Cesium.JulianDate.secondsDifference(
        clock.currentTime, 
        startTime
      );
      
      status.value = `动画进行中... ${Math.round(elapsedSeconds)}/${Math.round(totalDuration)} 秒`;
      
      // 检查是否完成
      if (Cesium.JulianDate.greaterThanOrEquals(clock.currentTime, stopTime)) {
        viewer.clock.onTick.removeEventListener(removeClockListener);
        
        // 动画完成后显示静态路径
        if (path.value) {
          path.value.polyline.show = true;
        }
        
        status.value = '动画完成';
        console.log('动画完成');
        
        // 延迟一点时间再将状态设为非动画中，以便用户能看到完成状态
        setTimeout(() => {
          isAnimating.value = false;
        }, 1000);
      }
    });
    
    console.log('开始时间序列动画，总时长:', totalDuration, '秒');
  } catch (error) {
    console.error('启动动画出错:', error);
    isAnimating.value = false;
    status.value = '动画启动失败: ' + error.message;
  }
};

// 增加点的高度以确保可见性
function addHeightToPosition(position, heightToAdd) {
  const cartographic = Cesium.Cartographic.fromCartesian(position);
  return Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    (cartographic.height || 0) + heightToAdd
  );
}

// 监听线宽和颜色的变化，更新路径
watch([lineWidth, lineColor], () => {
  if (points.value.length >= 2) {
    drawPath();
  }
});

// 监听组合坐标的变化，自动解析
watch(combinedCoordinates, (newValue) => {
  if (newValue) {
    parseCoordinates();
  }
});

// 清除路径
const clearPath = () => {
  if (isAnimating.value) {
    stopAnimation();
  }
  
  if (window.animationFrameId) {
    cancelAnimationFrame(window.animationFrameId);
    window.animationFrameId = null;
  }
  
  try {
    // 清除所有点实体
    for (const entity of pointEntities.value) {
      viewer.entities.remove(entity);
    }
    
    // 清除路径
    if (path.value) {
      viewer.entities.remove(path.value);
    }
    
    // 清除动画路径
    if (animationPath.value) {
      viewer.entities.remove(animationPath.value);
    }
    
    // 重置状态
    points.value = [];
    pointEntities.value = [];
    path.value = null;
    animationPath.value = null;
    
    status.value = '路径已清除，点击地图添加新点';
  } catch (error) {
    console.error('清除路径出错:', error);
  }
};

// 停止动画
const stopAnimation = () => {
  if (animationCancel) {
    animationCancel.cancelled = true;
    animationCancel = null;
  }
  
  if (window.animationFrameId) {
    cancelAnimationFrame(window.animationFrameId);
    window.animationFrameId = null;
  }
  
  // 停止时钟
  viewer.clock.shouldAnimate = false;
  
  if (animationPath.value) {
    viewer.entities.remove(animationPath.value);
    animationPath.value = null;
  }
  
  // 停止跟踪实体
  viewer.trackedEntity = undefined;
  
  // 移除跟踪实体
  const trackedEntity = viewer.entities.getById('trackedPosition');
  if (trackedEntity) {
    viewer.entities.remove(trackedEntity);
  }
  
  // 重新显示静态路径
  if (path.value && points.value.length >= 2) {
    path.value.polyline.show = true;
  }
  
  isAnimating.value = false;
};
</script>

<style>
.cesium-view {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  background-color: red;
}

#cesiumContainer {
  width: 100%;
  height: 100vh;
  flex:1;
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

.coordinate-input,
.animation-settings {
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

.input-group input,
.input-group select {
  flex: 1;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #666;
  background: #333;
  color: white;
}

.input-group span {
  margin-left: 5px;
  min-width: 30px;
  text-align: right;
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