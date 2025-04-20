# 3D模型显示调整指南

当你将真实的3D模型添加到系统后，可能需要调整模型的大小、位置和旋转，以确保它们在场景中正确显示。本指南将帮助你了解如何调整这些参数。

## 在代码中调整模型

打开 `index.html` 文件，找到 `loadRealisticModels()` 函数。在此函数中，有一个 `deviceModels` 对象，它定义了每种设备模型的参数：

```javascript
const deviceModels = {
    'router': {
        path: modelBasePath + 'router.glb',
        scale: new THREE.Vector3(0.5, 0.5, 0.5),
        offset: new THREE.Vector3(0, 0, 0)
    },
    'tv': {
        path: modelBasePath + 'tv.glb',
        scale: new THREE.Vector3(0.8, 0.8, 0.8),
        offset: new THREE.Vector3(0, 0.2, 0)
    },
    // ... 其他设备
};
```

## 调整参数说明

### 1. 缩放 (scale)

`scale` 参数控制模型的大小。它是一个三维向量，分别控制X、Y和Z方向的缩放比例：

- 增大数值 = 模型变大
- 减小数值 = 模型变小

例如，如果路由器模型太大，可以将 `scale` 从 `(0.5, 0.5, 0.5)` 改为 `(0.3, 0.3, 0.3)`。

### 2. 位置偏移 (offset)

`offset` 参数控制模型相对于原始位置的偏移。这在模型的参考点与预期不同时很有用：

- X轴: 正值向右移动，负值向左移动
- Y轴: 正值向上移动，负值向下移动
- Z轴: 正值向前移动，负值向后移动

例如，如果电视模型需要向上移动一些，可以将 `offset` 从 `(0, 0.2, 0)` 改为 `(0, 0.5, 0)`。

### 3. 旋转 (rotation)

如果需要旋转模型，可以在 `deviceModels` 对象中添加 `rotation` 参数：

```javascript
'router': {
    path: modelBasePath + 'router.glb',
    scale: new THREE.Vector3(0.5, 0.5, 0.5),
    offset: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Vector3(0, Math.PI / 2, 0)  // 绕Y轴旋转90度
}
```

旋转使用弧度制：
- X轴旋转: 控制前后倾斜
- Y轴旋转: 控制左右旋转
- Z轴旋转: 控制侧向倾斜

提示: `Math.PI` 是180度，`Math.PI/2` 是90度，以此类推。

## 修改代码实现旋转

要在代码中支持旋转，需要修改 `replaceSimpleDevicesWithModels` 函数中的 `loadGLTFModel` 调用：

```javascript
loadGLTFModel(
    modelInfo.path, 
    targetScene, 
    // 位置
    new THREE.Vector3(
        position.x + modelInfo.offset.x, 
        position.y + modelInfo.offset.y, 
        position.z + modelInfo.offset.z
    ),
    // 缩放
    modelInfo.scale,
    // 旋转 - 检查是否存在rotation参数
    modelInfo.rotation || null,
    // 回调函数
    (modelGroup) => {
        // ... 现有代码 ...
    }
);
```

## 常见问题排查

1. **模型不可见**：
   - 检查 `scale` 是否太小或太大
   - 确认 `offset` 没有将模型移到视野外
   - 确保模型文件正确加载（查看控制台错误）

2. **模型方向错误**：
   - 添加/调整 `rotation` 参数
   - 某些模型可能默认方向与预期不同，通常需要绕Y轴旋转

3. **模型位置不正确**：
   - 调整 `offset` 参数
   - 对于地面设备（如扫地机器人），通常需要负Y偏移

4. **模型大小不协调**：
   - 调整所有模型的 `scale` 参数，保持设备之间的比例关系
   - 电视通常应该比音箱大，路由器应该比电脑小，等等

## 示例：完整的旋转支持实现

为了更好地支持旋转，你可能需要在代码中添加如下修改：

```javascript
if (rotation) {
    model.rotation.x = rotation.x || 0;
    model.rotation.y = rotation.y || 0;
    model.rotation.z = rotation.z || 0;
}
```

到 `loadGLTFModel` 函数中，以确保正确应用旋转参数。 