@echo off
chcp 65001 >nul
title 📐 3D立体几何学习平台

echo ========================================
echo     📐 3D立体几何学习平台
echo ========================================
echo.
echo 正在启动开发服务器，请稍候...
echo.

:: 切换到项目目录
cd /d "%~dp0"

:: 安装依赖（如果没装过的话）
if not exist "node_modules\" (
    echo [1/2] 首次安装依赖包，需要1-2分钟...
    call npm install
    echo.
)

:: 启动开发服务器并自动打开浏览器
echo [2/2] 启动3D几何建模平台...
start "" http://localhost:5173
echo.
echo 等待服务器就绪后请手动刷新浏览器，或等待自动打开...
call npm run dev

pause