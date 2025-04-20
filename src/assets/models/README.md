# 3D模型文件夹

此文件夹用于存放网络设备的3D模型。为确保应用程序能正确加载模型，请按照以下说明操作：

## 所需模型文件

应用程序需要以下模型文件（GLB格式）：

1. `router.glb` - 路由器模型
2. `tv.glb` - 智能电视模型 
3. `speaker.glb` - 智能音箱模型
4. `vacuum.glb` - 扫地机器人模型
5. `computer.glb` - 电脑模型
6. `ac.glb` - 空调模型

## 获取模型的方法

### 方法1：从3D模型库下载

你可以从以下网站获取免费模型：

- [Sketchfab](https://sketchfab.com/features/free-3d-models)
- [TurboSquid](https://www.turbosquid.com/Search/3D-Models/free)
- [Free3D](https://free3d.com)
- [CGTrader](https://www.cgtrader.com/free-3d-models)

下载后，确保：
1. 将模型转换为GLB格式（如果尚未是该格式）
2. 重命名为上述指定的文件名
3. 放置在此文件夹中

### 方法2：使用Blender创建模型

如果你熟悉3D建模，可以使用[Blender](https://www.blender.org/)（免费开源）创建简单的设备模型，并导出为GLB格式。

### 方法3：使用下载脚本（示例）

你可以创建一个简单的脚本来自动下载一些选定的免费模型。例如：

```bash
#!/bin/bash

# 创建临时目录
mkdir -p temp_models
cd temp_models

# 下载一些公开的GLB模型示例（以下URL仅为示例，需替换为实际有效的URL）
echo "下载路由器模型..."
curl -L "https://example.com/models/router.glb" -o router.glb

echo "下载智能电视模型..."
curl -L "https://example.com/models/tv.glb" -o tv.glb

# ... 下载其他模型 ...

# 移动到正确的文件夹
mv *.glb ../

# 清理
cd ..
rm -rf temp_models

echo "所有模型下载完成！"
```

## 确保风格统一

为了保持应用中设备模型风格的一致性，建议：

1. 选择同一系列或同一作者的模型
2. 优先使用低多边形（low-poly）风格的模型
3. 使用相似的颜色方案和细节级别
4. 如有需要，可在Blender中调整模型以保持风格一致

## 模型大小和方向

加载后，应用会自动调整模型的大小和位置。如果模型显示不正确，你可能需要在代码中调整：

- `scale` - 控制模型大小
- `offset` - 控制模型相对于原始位置的偏移
- `rotation` - 控制模型旋转（如需调整）

这些参数可在 `index.html` 文件的 `loadRealisticModels()` 函数中找到。 