<#
╔══════════════════════════════════════════════════════════════╗
║           🚀 新电脑开发环境一键迁移脚本                       ║
║           适用于：Yu Guan 的 Windows 开发环境                 ║
║           生成时间：2026-06-20                               ║
╚══════════════════════════════════════════════════════════════╝

使用方法：
  1. 把这个脚本放到 U 盘
  2. 新电脑插上 U 盘，以管理员身份运行 PowerShell
  3. 执行：Set-ExecutionPolicy Bypass -Scope Process -Force
  4. 执行：.\setup-new-pc.ps1
  5. 按提示操作，必要时重启

注意：脚本不会自动安装 Node.js（需手动下载）
      部分步骤需要交互登录
#>

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║           🚀 新电脑开发环境一键迁移                           ║
║           按 1-5 选择步骤，或输入 A 全自动安装               ║
╚══════════════════════════════════════════════════════════════╝

  本脚本需要管理员权限运行。
  建议顺序：1 → 2 → 3 → 4 → 5

"@ -ForegroundColor Cyan

# ============================================================
# 检测是否管理员
# ============================================================
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠ 建议以管理员身份运行此脚本" -ForegroundColor Yellow
}

# ============================================================
# 步骤 1：安装基础工具（winget）
# ============================================================
function Install-BaseTools {
    Write-Host "`n[1/5] 安装基础工具 (winget)..." -ForegroundColor Green

    # Git
    $git = Get-Command git -ErrorAction SilentlyContinue
    if (-not $git) {
        Write-Host "  安装 Git..." -ForegroundColor Yellow
        winget install --id Git.Git --source winget --accept-source-agreements --accept-package-agreements
        # 刷新 PATH
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    } else {
        Write-Host "  ✓ Git 已安装" -ForegroundColor Green
    }

    # GitHub CLI
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) {
        Write-Host "  安装 GitHub CLI..." -ForegroundColor Yellow
        winget install --id GitHub.cli --source winget --accept-source-agreements --accept-package-agreements
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    } else {
        Write-Host "  ✓ GitHub CLI 已安装" -ForegroundColor Green
    }

    Write-Host "  ✓ 基础工具安装完成" -ForegroundColor Green
}

# ============================================================
# 步骤 2：配置 Git
# ============================================================
function Setup-Git {
    Write-Host "`n[2/5] 配置 Git..." -ForegroundColor Green

    git config --global user.name "Yu Guan"
    git config --global user.email "yy2221816415u@gmail.com"
    git config --global core.editor "code --wait"
    git config --global http.version HTTP/1.1

    Write-Host "  ✓ Git 配置完成" -ForegroundColor Green
    Write-Host "  user.name  = Yu Guan" -ForegroundColor Gray
    Write-Host "  user.email = yy2221816415u@gmail.com" -ForegroundColor Gray
    Write-Host "  editor     = code --wait" -ForegroundColor Gray
}

# ============================================================
# 步骤 3：登录 GitHub / Vercel / Railway
# ============================================================
function Setup-Auth {
    Write-Host "`n[3/5] 配置认证..." -ForegroundColor Green

    # GitHub
    $ghCheck = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  登录 GitHub（浏览器会弹出，请按提示操作）..." -ForegroundColor Yellow
        gh auth login --web -h github.com -p https
    } else {
        Write-Host "  ✓ GitHub 已登录" -ForegroundColor Green
    }

    # Vercel
    $vercelCheck = Get-Command vercel -ErrorAction SilentlyContinue
    if ($vercelCheck) {
        Write-Host "  检查 Vercel 登录状态..." -ForegroundColor Yellow
        vercel whoami 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  运行 vercel login（浏览器会弹出）..." -ForegroundColor Yellow
            vercel login
        } else {
            Write-Host "  ✓ Vercel 已登录" -ForegroundColor Green
        }
    }

    # Railway
    $railwayCheck = Get-Command railway -ErrorAction SilentlyContinue
    if ($railwayCheck) {
        Write-Host "  检查 Railway 登录..." -ForegroundColor Yellow
        railway whoami 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  运行 railway login..." -ForegroundColor Yellow
            railway login
        } else {
            Write-Host "  ✓ Railway 已登录" -ForegroundColor Green
        }
    }
}

# ============================================================
# 步骤 4：安装 npm 全局包 + 克隆项目
# ============================================================
function Setup-DevEnvironment {
    Write-Host "`n[4/5] 安装 npm 全局包 + 克隆项目..." -ForegroundColor Green

    # 检测 Node.js
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host @"
  ✗ 未检测到 Node.js
    请手动安装：https://nodejs.org/ （推荐 v22 LTS 或 v24）
    安装后重新运行此脚本
"@ -ForegroundColor Red
        return
    }
    Write-Host "  ✓ Node.js $(node --version)" -ForegroundColor Green

    # npm 全局包
    $globalPackages = @(
        "@anthropic-ai/claude-code",
        "vercel",
        "@railway/cli",
        "gh"
    )

    foreach ($pkg in $globalPackages) {
        $installed = npm list -g --depth=0 --parseable $pkg 2>$null
        if (-not $installed) {
            Write-Host "  安装 $pkg ..." -ForegroundColor Yellow
            npm install -g $pkg 2>&1 | Out-Null
            Write-Host "  ✓ $pkg 已安装" -ForegroundColor Green
        } else {
            Write-Host "  ✓ $pkg 已存在" -ForegroundColor Green
        }
    }

    # 创建桌面目录并克隆主项目
    $desktop = [Environment]::GetFolderPath("Desktop")
    $projectDir = Join-Path $desktop "geometry-3d-learning"

    if (-not (Test-Path $projectDir)) {
        Write-Host "  克隆 geometry-3d-learning 到桌面..." -ForegroundColor Yellow
        Push-Location $desktop
        git clone https://github.com/jinjiqiannian/geometry-3d-learning.git
        Pop-Location

        if (Test-Path $projectDir) {
            Write-Host "  安装项目依赖..." -ForegroundColor Yellow
            Push-Location $projectDir
            npm install
            Pop-Location
            Write-Host "  ✓ 项目拉取完成" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✓ geometry-3d-learning 目录已存在，跳过克隆" -ForegroundColor Green
    }

    # 创建 projects 目录
    $projectsDir = Join-Path $env:USERPROFILE "projects"
    if (-not (Test-Path $projectsDir)) {
        New-Item -ItemType Directory -Path $projectsDir -Force | Out-Null
        Write-Host "  ✓ 创建 $projectsDir" -ForegroundColor Green
    }

    Write-Host "  ⚠ 注意：ai-daily 项目需要手动从旧电脑复制" -ForegroundColor Yellow
    Write-Host "    (旧路径：C:\Users\关羽\projects\ai-daily)" -ForegroundColor Yellow
}

# ============================================================
# 步骤 5：配置 Claude Code 和 VSCode
# ============================================================
function Setup-CodeTools {
    Write-Host "`n[5/5] 配置 Claude Code + VSCode 扩展..." -ForegroundColor Green

    # ---- Claude Code 配置 ----
    $claudeDir = Join-Path $env:USERPROFILE ".claude"
    $settingsPath = Join-Path $claudeDir "settings.json"

    if (-not (Test-Path $claudeDir)) {
        New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
    }

    if (-not (Test-Path $settingsPath)) {
        Write-Host @"

  ⚠ 需要旧电脑的 Claude Code 配置！
    请将旧电脑的 settings.json 复制到新电脑：

      来源：%USERPROFILE%\.claude\settings.json
      目标：$settingsPath

    如果暂时没有，脚本会生成一个最小配置（不含 API Key）。

"@ -ForegroundColor Yellow

        $choice = Read-Host "  是否现在手动粘贴 API Key？(y/N)"
        if ($choice -eq "y") {
            $apiKey = Read-Host "  请输入 DeepSeek API Key (sk-...)"

            $settings = @{
                model    = "deepseek-v4-flash"
                theme    = "dark"
                effort   = "xhigh"
                apiBase  = "https://api.deepseek.com/anthropic"
                apiKey   = $apiKey
                plugins  = @{
                    "paideia@paideia-marketplace" = @{
                        source = "OPTIMETA/PAIDEIA"
                    }
                }
                allow    = @(
                    "C:\Users\*\Desktop\geometry-3d-learning\**",
                    "C:\Users\*\projects\**",
                    "C:\Users\*\Desktop\geometry-3d-learning"
                )
            } | ConvertTo-Json -Depth 10

            $settings | Out-File -FilePath $settingsPath -Encoding utf8
            Write-Host "  ✓ 配置已写入 $settingsPath" -ForegroundColor Green
        } else {
            @"
{
    "model": "deepseek-v4-flash",
    "theme": "dark",
    "effort": "xhigh",
    "apiBase": "https://api.deepseek.com/anthropic"
}
"@ | Out-File -FilePath $settingsPath -Encoding utf8
            Write-Host "  ⚠ 已生成最小配置，API Key 需要手动补充到：" -ForegroundColor Yellow
            Write-Host "    $settingsPath" -ForegroundColor Yellow
            Write-Host "    添加 `"apiKey`": `"sk-...`"," -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✓ settings.json 已存在" -ForegroundColor Green
    }

    # ---- Claude 记忆恢复提示 ----
    $memoryDir = Join-Path $claudeDir "projects\c--Users----Desktop-geometry-3d-learning\memory"
    if (-not (Test-Path $memoryDir)) {
        Write-Host @"
  ⚠ 建议从旧电脑恢复 Claude 记忆：
    来源：%USERPROFILE%\.claude\projects\c--Users----Desktop-geometry-3d-learning\memory\
    目标：$memoryDir
    只需复制 memory 文件夹即可恢复所有历史记忆。
"@ -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Claude 记忆已存在" -ForegroundColor Green
    }

    # ---- VSCode 扩展 ----
    $code = Get-Command code -ErrorAction SilentlyContinue
    if ($code) {
        $extensions = @(
            "anthropic.claude-code",
            "dbaeumer.vscode-eslint",
            "donjayamanne.githistory",
            "eamodio.gitlens",
            "firefox-devtools.vscode-firefox-debug",
            "github.vscode-github-actions",
            "ms-azuretools.vscode-containers",
            "ms-ceintl.vscode-language-pack-zh-hans",
            "ms-edgedevtools.vscode-edge-devtools",
            "ms-vscode.powershell"
        )

        Write-Host "  安装 VSCode 扩展..." -ForegroundColor Yellow
        foreach ($ext in $extensions) {
            $installed = code --list-extensions 2>$null | Select-String -Pattern "^$ext$"
            if (-not $installed) {
                Write-Host "    安装 $ext ..." -ForegroundColor Gray
                code --install-extension $ext --force 2>$null
                Write-Host "    ✓ $ext" -ForegroundColor Green
            } else {
                Write-Host "    ✓ $ext (已安装)" -ForegroundColor Green
            }
        }
        Write-Host "  ✓ VSCode 扩展安装完成" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ 未检测到 VSCode CLI (code)，请先安装 VSCode" -ForegroundColor Yellow
        Write-Host "    安装后手动运行扩展安装命令（见 README）" -ForegroundColor Yellow
    }

    # ---- Node.js 检查 ----
    Write-Host "`n  ✓ 当前 Node.js: $(node -v) / npm: $(npm -v)" -ForegroundColor Green
}

# ============================================================
# 主菜单
# ============================================================
function Show-Menu {
    Write-Host @"

═══════════════════════════════════════════════════════════════
  请选择要执行的步骤：

    [1] 安装基础工具（Git、GitHub CLI via winget）
    [2] 配置 Git（user/email/editor）
    [3] 登录 GitHub / Vercel / Railway
    [4] 安装 npm 全局包 + 克隆项目
    [5] 配置 Claude Code + VSCode 扩展
    [A] 全自动执行 1→2→3→4→5
    [Q] 退出
═══════════════════════════════════════════════════════════════

"@ -ForegroundColor Cyan

    $choice = Read-Host "请输入"

    switch ($choice.ToUpper()) {
        "1" { Install-BaseTools; Show-Menu }
        "2" { Setup-Git; Show-Menu }
        "3" { Setup-Auth; Show-Menu }
        "4" { Setup-DevEnvironment; Show-Menu }
        "5" { Setup-CodeTools; Show-Menu }
        "A" {
            Install-BaseTools
            Setup-Git
            Setup-Auth
            Setup-DevEnvironment
            Setup-CodeTools
            Show-Summary
        }
        "Q" { Write-Host "退出。" -ForegroundColor Gray }
        default { Show-Menu }
    }
}

# ============================================================
# 完成总结
# ============================================================
function Show-Summary {
    Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║              ✅ 自动安装完成！                               ║
╚══════════════════════════════════════════════════════════════╝

⚠ 以下操作需要你手动完成：

  1. 【Node.js】如果还没装，去 https://nodejs.org 下载 v22 LTS

  2. 【Claude Code API Key】
     打开 %USERPROFILE%\.claude\settings.json
     补充 "apiKey": "sk-..."

  3. 【Claude 记忆恢复】
     从旧电脑复制：
       %USERPROFILE%\.claude\projects\c--Users----Desktop-geometry-3d-learning\memory\
     到新电脑相同路径

  4. 【ai-daily 项目】
     从旧电脑复制 C:\Users\关羽\projects\ai-daily
     到新电脑 C:\Users\xxx\projects\ai-daily

  5. 【重启电脑】让 PATH 生效

"@ -ForegroundColor Cyan
}

# ============================================================
# 启动
# ============================================================
Show-Menu
