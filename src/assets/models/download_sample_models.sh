#!/bin/bash

# 检查curl命令是否可用
if ! command -v curl &> /dev/null; then
    echo "错误: 此脚本需要curl命令，但未找到。"
    echo "请安装curl后再试。"
    exit 1
fi

echo "========================================="
echo "  开始下载网络设备3D模型示例"
echo "========================================="

# 创建临时目录
mkdir -p temp_models
cd temp_models

# 模型下载链接 - 这些是一些可用的免费模型示例
# 注意：这些URL可能会变更，请根据需要替换为可用的链接

# 路由器模型 - 从Sketchfab获取的低多边形路由器样例
echo "下载路由器模型..."
curl -L "https://sketchfab.com/download-model/f29c137c29a24419b47a0c48a8360a1c?token=1234567890" -o router.glb

# 智能电视模型 - 从Free3D获取的电视样例
echo "下载智能电视模型..."
curl -L "https://free3d.com/download-model/modern-tv-12345.glb" -o tv.glb

# 智能音箱模型
echo "下载智能音箱模型..."
curl -L "https://sketchfab.com/download-model/smart-speaker-12345.glb" -o speaker.glb

# 扫地机器人模型
echo "下载扫地机器人模型..."
curl -L "https://free3d.com/download-model/robot-vacuum-12345.glb" -o vacuum.glb

# 电脑模型
echo "下载电脑模型..."
curl -L "https://sketchfab.com/download-model/desktop-computer-12345.glb" -o computer.glb

# 空调模型
echo "下载空调模型..."
curl -L "https://free3d.com/download-model/air-conditioner-12345.glb" -o ac.glb

# 检查下载文件
echo "检查下载的文件..."
ls -la

# 检查文件是否有效
for file in router.glb tv.glb speaker.glb vacuum.glb computer.glb ac.glb; do
    if [ ! -f "$file" ] || [ ! -s "$file" ]; then
        echo "警告: $file 下载失败或为空文件"
    fi
done

# 移动到模型文件夹
echo "移动文件到模型文件夹..."
mv *.glb ../

# 清理临时目录
cd ..
rm -rf temp_models

echo ""
echo "注意: 此脚本中的下载链接仅为示例，可能无法工作。"
echo "请访问以下网站获取真实的3D模型文件:"
echo "- https://sketchfab.com/features/free-3d-models"
echo "- https://www.turbosquid.com/Search/3D-Models/free"
echo "- https://free3d.com"
echo "- https://www.cgtrader.com/free-3d-models"
echo ""
echo "下载后，确保将模型转换为GLB格式并重命名为上述对应的文件名。"
echo ""
echo "完成！" 