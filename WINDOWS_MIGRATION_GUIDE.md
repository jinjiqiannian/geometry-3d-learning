# 💻 Windows 换机完整迁移指南

> 目标：低风险、可恢复、分步骤。适合非专业用户按步操作。
> 适用场景：Windows 10→11 / 11→11，工作+学习+开发环境
> 核心原则：**先清理、再迁移、后验证。绝不裸奔迁移。**

---

## 🔍 一、迁移前准备清单（旧电脑上完成）

### 1.1 磁盘清理（避免迁移垃圾）

```powershell
# 以管理员身份运行 PowerShell，逐个执行：

# ① 运行磁盘清理
cleanmgr /sageset:1   # 勾选所有项目（临时文件、回收站、缩略图缓存等）
cleanmgr /sagerun:1   # 执行清理

# ② 清理 Windows.old（如果有）
dism /online /Cleanup-Image /StartComponentCleanup /ResetBase

# ③ 清理浏览器缓存
# Chrome: 设置 → 隐私和安全 → 清除浏览数据 → "所有时间"
# Edge:   设置 → 隐私和安全性 → 清除浏览数据

# ④ 清空下载文件夹，删除无用安装包
# 路径：%USERPROFILE%\Downloads
```

**至少释放 10-30 GB 空间，减少传输量。**

### 1.2 盘点软件清单

打开「设置 → 应用 → 安装的应用」，导出列表：

```powershell
# 导出已安装软件列表到桌面
Get-ItemProperty HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*,
                HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* |
  Where-Object DisplayName |
  Select-Object DisplayName, DisplayVersion, Publisher |
  Sort-Object DisplayName |
  Export-Csv "$env:USERPROFILE\Desktop\installed_software.csv" -NoTypeInformation -Encoding UTF8
```

然后人工标记：
- ✅ **必须重装**（VS Code、浏览器、微信、Office、开发工具等）
- ⏸ **按需安装**（PDF 阅读器、压缩工具、播放器等）
- ❌ **不安装**（旧驱动、试用版软件、垃圾清理工具、系统优化工具）

### 1.3 数据摸底

在旧电脑上运行以下脚本，生成数据清单：

```powershell
# 生成数据盘点报告到桌面
$report = @()

# ① 桌面
$desktop = [Environment]::GetFolderPath("Desktop")
$report += "=== 桌面 ($desktop) ==="
Get-ChildItem $desktop -Depth 0 | ForEach-Object {
    $report += "$(if($_.PSIsContainer){'[DIR]'}else{'[FILE]'}) $($_.Name)  $([math]::Round($_.Length/1MB,1))MB  $($_.LastWriteTime)"
}

# ② 文档
$docs = [Environment]::GetFolderPath("MyDocuments")
$report += "`n=== 文档 ($docs) ==="
Get-ChildItem $docs -Depth 0 | ForEach-Object {
    $report += "$(if($_.PSIsContainer){'[DIR]'}else{'[FILE]'}) $($_.Name)  $($_.LastWriteTime)"
}

# ③ 下载
$downloads = Join-Path $env:USERPROFILE "Downloads"
$report += "`n=== 下载文件夹 ==="
Get-ChildItem $downloads -Depth 0 | Sort-Object Length -Descending | Select-Object -First 20 | ForEach-Object {
    $report += "$($_.Name)  $([math]::Round($_.Length/1MB,1))MB"
}

$report | Out-File "$env:USERPROFILE\Desktop\data_inventory.txt" -Encoding UTF8
Write-Host "数据清单已生成到桌面：data_inventory.txt" -ForegroundColor Green

# 统计总数据量
$totalSize = (Get-ChildItem $desktop -Recurse -File | Measure-Object Length -Sum).Sum +
             (Get-ChildItem $docs -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host "桌面 + 文档 估算总大小: $([math]::Round($totalSize/1GB,1)) GB"
```

### 1.4 确认网络环境

| 迁移方式 | 需要条件 |
|---------|---------|
| 外接硬盘 | USB 3.0 口 + NTFS 格式硬盘（≥数据量的 1.5 倍） |
| 局域网共享 | 旧电脑和新电脑在同一 Wi-Fi/有线网络下 |
| 云同步 | 上传带宽 ≥20Mbps，且耐心等待 |

---

## 📦 二、数据分类方案（什么该搬，什么不该搬）

### 必须迁移（红色优先级）

| 类别 | 典型路径 | 说明 |
|------|---------|------|
| 桌面文件 | `%USERPROFILE%\Desktop\*` | 逐项确认，不要全选复制 |
| 文档 | `%USERPROFILE%\Documents\*` | 办公文档、项目文件 |
| 图片照片 | `%USERPROFILE%\Pictures\*` | 相机照片、截图、设计素材 |
| 视频 | `%USERPROFILE%\Videos\*` | 仅个人拍摄/创作的素材 |
| 浏览器收藏夹/密码 | 浏览器内导出 | **不要复制整个 AppData** |
| 微信文件 | `文档\WeChat Files\` | 聊天记录 + 收到的文件 |
| 开发项目 | 各工作目录 | git 仓库、本地项目 |
| 证书/密钥 | `%USERPROFILE%\.ssh\` | 如有则复制 |
| 字体 | `C:\Windows\Fonts\`（自定义部分） | 仅第三方字体 |
| 邮件存档 | Outlook .pst 文件 | 如有 |

### 选择性迁移（黄色优先级）

| 类别 | 说明 |
|------|------|
| 下载文件夹 | 只留安装包和不重复的文件 |
| 音乐 | 如果是流媒体听的，不需要迁移 |
| 桌面快捷方式 | **不要复制**，到新电脑重装软件后重新生成 |
| VS Code 配置 | `%APPDATA%\Code\User\` 中的 settings.json + keybindings.json |
| 终端历史 | `%USERPROFILE%\.bash_history` 等（开发用） |
| 环境变量 | 手动记录特殊 PATH 条目 |

### 不建议迁移（灰色优先级）

| 类别 | 原因 |
|------|------|
| `C:\Windows\` 整个目录 | 新电脑有自己的系统 |
| `C:\Program Files` | 所有软件**必须重装**，不能直接复制 |
| `C:\Program Files (x86)` | 同上 |
| `%APPDATA%` 整个目录 | 只挑需要的子目录，软件配好后自然生成 |
| `C:\Users\旧用户名\AppData\Local\Temp` | 纯临时文件 |
| 注册表 | 绝不从旧电脑导出注册表到新电脑导入 |
| 驱动 | 新电脑用厂商最新驱动 |
| 系统优化/管家类软件 | 正好趁机扔掉 |

---

## 💾 三、推荐迁移方式对比

### 方式 A：外接硬盘/U 盘 ✅ 最推荐

| 项目 | 说明 |
|------|------|
| 适合 | **数据量大（>50GB）、希望最可控** |
| 成本 | 需要一块 ≥256GB 的外接硬盘或大容量 U 盘 |
| 速度 | USB 3.0 可达 100-400 MB/s |
| 优点 | 离线操作，不依赖网络；可断电恢复；可验证完整性 |
| 缺点 | 多一步复制操作；硬盘需足够大 |
| **推荐度** | ⭐⭐⭐⭐⭐ (最稳妥) |

**操作流程：**
```
旧电脑：数据复制到外接硬盘 → 验证 → 安全弹出
新电脑：从外接硬盘复制到新电脑对应位置 → 验证
```

### 方式 B：局域网共享

| 项目 | 说明 |
|------|------|
| 适合 | 两电脑同时在身边，数据量 10-200GB |
| 成本 | 0（需同一路由器下） |
| 速度 | 千兆局域网 100-110 MB/s；Wi-Fi 5 约 30-50 MB/s |
| 优点 | 无需额外硬件，零成本 |
| 缺点 | Wi-Fi 下较慢；传输中断需重来 |
| **推荐度** | ⭐⭐⭐⭐ (次选) |

### 方式 C：云同步（OneDrive/iCloud/百度云）

| 项目 | 说明 |
|------|------|
| 适合 | **数据量 <30GB**，文档为主 |
| 成本 | 免费 5-15GB，大容量需付费 |
| 速度 | 上行 3-5 MB/s（典型家庭宽带），1GB 约 3-5 分钟 |
| 优点 | 自动同步，新电脑登录即可 |
| 缺点 | 大文件/大量文件上传极慢；有隐私顾虑 |
| **推荐度** | ⭐⭐⭐ (仅适合文档和小文件) |

### 方式 D：Windows 内置工具（备份和还原 / Windows 轻松传送）

| 项目 | 说明 |
|------|------|
| 适合 | 旧电脑系统整体迁移到新电脑 |
| **强烈不推荐** | Win10→Win11 易出现驱动冲突、蓝屏、激活问题 |
| **推荐度** | ⭐ (不推荐) |

⚠ **结论：外接硬盘方案最稳妥。预算 100-200 元买个 USB 3.0 移动硬盘或 128GB+ U 盘，以后还能继续用。**

---

## 🧠 四、软件与环境迁移方案

### 4.1 浏览器（Edge / Chrome）

**收藏夹迁移（必须做，最简单也最容易忘）：**

```text
Chrome: 设置 → 书签 → 导出书签 → 保存 HTML 文件
Edge:   设置 → 收藏夹 → 导出 → 保存 HTML 文件

到新电脑后：导入书签 → 登录 Google/Microsoft 账号同步密码
```

**扩展程序：直接在旧电脑截个图或者导出列表**

```powershell
# Chrome 扩展列表
Get-ChildItem "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions" | Select-Object Name

# 或直接在新电脑登录 Chrome 账号，扩展会自动同步（推荐方式）
```

⚠ **不要复制整个 Chrome User Data 文件夹** — 版本不匹配直接闪退。

### 4.2 微信

微信是迁移的**重灾区**，因为它把所有聊天数据存在本地且路径隐蔽。

**标准做法（旧电脑）：**

```text
① 打开微信 PC 版
② 左下角「≡」→ 设置 → 文件管理 → 打开文件夹
   → 这会打开：文档\WeChat Files\wxid_xxxxxxxx\...
③ 复制整个 WeChat Files 文件夹到外接硬盘
   （注意：这个文件夹可能很大，10-100GB 都正常）

⚠ 不要从 AppData 路径复制微信数据
```

**新电脑恢复：**

```text
① 安装微信并登录一次（会生成 WeChat Files 目录）
② 退出微信
③ 用外接硬盘的旧数据覆盖新生成的 WeChat Files 文件夹
④ 重新打开微信，聊天记录全部恢复
```

### 4.3 VS Code

**推荐方式：登录 GitHub/Microsoft 账号同步**

```text
VS Code 内置同步：
  ① 旧电脑：左下角「齿轮」→ 设置同步 → 登录 GitHub → 启用同步
  ② 新电脑：同样步骤 → 同步设置 → 所有配置自动恢复
```

**如果无法在线同步，手动复制：**

```powershell
# 旧电脑导出：
Copy-Item "$env:APPDATA\Code\User\settings.json" "E:\backup\vscode_settings.json"
Copy-Item "$env:APPDATA\Code\User\keybindings.json" "E:\backup\vscode_keybindings.json"

# 扩展列表导出：
code --list-extensions > "E:\backup\vscode_extensions.txt"

# 新电脑安装扩展：
cat E:\backup\vscode_extensions.txt | ForEach-Object { code --install-extension $_ }
```

### 4.4 开发环境

| 工具 | 迁移方案 |
|------|---------|
| **Git** | 新电脑重装，`git config --global` 重新配置 |
| **SSH Key** | 如果旧电脑有 `~/.ssh/`，复制 `id_rsa` 和 `id_rsa.pub`（注意安全） |
| **Node.js** | 新电脑去 nodejs.org 重新下载安装 |
| **npm 全局包** | `npm list -g --depth=0 > packages.txt` 然后在新电脑 `npm install -g` 逐个安装 |
| **Python** | 新电脑重装，pip freeze > requirements.txt 导出 |
| **环境变量 PATH** | 截图记录旧电脑 PATH，新电脑手动添加需要的条目 |
| **Docker Desktop** | 新电脑重装，镜像重新拉取 |
| **Windows Terminal** | 设置会同步到 Microsoft 账号（如果登录了） |

### 4.5 字体

复制旧电脑安装的第三方字体（不要复制系统内置字体）：

```powershell
# 列出非微软字体（可能有误判，但可以做个参考）
Get-ChildItem "C:\Windows\Fonts\*" | Where-Object {$_.LastWriteTime -gt (Get-Date "2020-01-01")} |
  Select-Object Name | Out-File "$env:USERPROFILE\Desktop\fonts_list.txt"

# 手动复制：打开 C:\Windows\Fonts，按修改时间排序
# 复制 2020 年之后的字体文件到 E:\backup\fonts\
# 或直接用以下命令（需要管理员）
Copy-Item "C:\Windows\Fonts\*.ttf" "E:\backup\fonts\" -ErrorAction SilentlyContinue
```

新电脑：右键 `.ttf` 文件 → 安装，或全选后批量安装。

### 4.6 输入法自定义词库

| 输入法 | 迁移方法 |
|--------|---------|
| 搜狗 | 设置 → 词库 → 备份词库 |
| 微软拼音 | 登录 Microsoft 账号自动同步 |
| 百度输入法 | 设置 → 词库管理 → 导出 |

---

## ⚙️ 五、分步骤迁移流程（从旧电脑到新电脑的执行顺序）

### 第 1 阶段：旧电脑清理与准备（耗时 30-60 分钟）

```
□ 1.1 运行磁盘清理（cleanmgr）
□ 1.2 清理下载文件夹
□ 1.3 卸载不需要的软件（试用版、旧驱动、垃圾工具）
□ 1.4 运行数据盘点脚本
□ 1.5 导出浏览器收藏夹 + 密码（CSV或HTML）
□ 1.6 导出 VS Code 扩展列表（如在用）
□ 1.7 导出 npm/Python 包列表（如在用）
□ 1.8 确认外接硬盘有足够空间
□ 1.9 整理桌面文件（归类到文档/图片/项目文件夹）
```

### 第 2 阶段：旧电脑数据导出（耗时取决于数据量）

```
□ 2.1 连接外接硬盘，格式化为 NTFS（如果新盘）
□ 2.2 复制「文档」目录到外接硬盘
□ 2.3 复制「图片」目录到外接硬盘
□ 2.4 复制「视频」目录到外接硬盘
□ 2.5 复制「桌面」目录到外接硬盘（按需挑选）
□ 2.6 复制微信 WeChat Files 文件夹
□ 2.7 复制开发项目文件夹
□ 2.8 复制 .ssh 目录（如有）
□ 2.9 复制字体文件
□ 2.10 复制 VS Code 配置文件
□ 2.11 导出输入法词库
```

**⚠ 每复制完一个目录，核对一下文件数量和总大小：**

```powershell
# 验证命令（以文档为例）：
# 在旧电脑查看源大小
(Get-ChildItem "C:\Users\关羽\Documents" -Recurse -File | Measure-Object Length -Sum).Sum / 1GB

# 在外接硬盘查看已复制的大小
(Get-ChildItem "E:\Documents" -Recurse -File | Measure-Object Length -Sum).Sum / 1GB

# 两个值应该基本一致（差异 <1%）
```

### 第 3 阶段：新电脑系统设置（耗时 1-2 小时）

```
□ 3.1 开箱启动 Windows，完成 OOBE（语言、网络、账号）
□ 3.2 登录 Microsoft 账号
□ 3.3 Windows 更新到最新（重要！驱动会自动装上）
□ 3.4 设置 → 系统 → 存储 → 开启存储感知
□ 3.5 设置 → 隐私和安全 → 设备加密（如支持则开启）
□ 3.6 安装显卡驱动、芯片组驱动（从厂商官网下载）
□ 3.7 设置文件资源管理器：查看 → 显示文件扩展名 + 显示隐藏文件
□ 3.8 电源选项：设置为高性能（台式机）或平衡（笔记本）
```

### 第 4 阶段：软件安装（耗时 1-3 小时）

**先安装核心软件，边装边测试：**

```
第一批（底层，必备）：
□ Git for Windows
□ Visual Studio Code
□ Node.js (LTS)
□ Python (可选)
□ 7-Zip 或 NanaZip（解压工具）

第二批（通讯与浏览器）：
□ Chrome 或 Edge（登录账号自动恢复收藏夹）
□ 微信
□ 钉钉 / 腾讯会议（如用）
□ 输入法（搜狗/百度）

第三批（办公与生产力）：
□ Office 或 WPS
□ Notion / Obsidian（如用）
□ 截图工具（Snipaste / Snagit）
□ 翻译工具（如有）

第四批（设计与媒体）：
□ Photoshop / 剪映 / 其他设计软件
□ 字体批量安装
```

### 第 5 阶段：数据恢复（耗时取决于数据量）

```
□ 5.1 从外接硬盘复制「文档」到新电脑对应位置
□ 5.2 从外接硬盘复制「图片」到新电脑
□ 5.3 从外接硬盘复制「视频」到新电脑
□ 5.4 恢复微信聊天记录（先安装登录一次，退出，覆盖 WeChat Files）
□ 5.5 恢复开发项目到工作目录
□ 5.6 恢复 VS Code 配置（或使用同步）
□ 5.7 恢复浏览器书签（或登录账号同步）
□ 5.8 恢复字体
□ 5.9 恢复输入法词库
□ 5.10 恢复环境变量 PATH（手动添加需要的条目）
```

### 第 6 阶段：验证与收尾（耗时 30 分钟）

```
□ 6.1 验证所有文件完整性（对照文件数量和大小）
□ 6.2 微信能正常打开，聊天记录完整
□ 6.3 开发项目能正常 git pull / npm install / npm run dev
□ 6.4 打印机/扫描仪正常工作
□ 6.5 外设（鼠标、键盘、显示器扩展）配置正常
□ 6.6 测试网络：Wi-Fi、蓝牙
□ 6.7 登录各网站（GitHub、Vercel、邮箱等）
□ 6.8 确认 Windows 已激活
```

### 第 7 阶段：旧电脑数据保留（建议保留 1 个月）

```
□ 7.1 确认新电脑一切正常后（至少 1 周），再考虑清空旧电脑
□ 7.2 旧电脑不要立即格式化或出售——留 1 个月作为备份
□ 7.3 如果旧电脑要出售/回收：
    ① 备份所有重要数据到外接硬盘（二次确认）
    ② 登录 Microsoft 账号 → 设备 → 移除旧电脑信任
    ③ 登录 Google Chrome → 移除设备
    ④ 运行「重置此电脑」→ 删除所有文件
    ⑤ 或使用 DBAN 等工具擦除磁盘
```

---

## 🚨 六、常见踩坑提醒

### 🕳 坑 1：直接复制 Program Files

**❌ 错误做法**：把旧电脑 `C:\Program Files\VS Code` 整个复制到新电脑
**✅ 正确做法**：所有软件重新安装，不能直接复制

> 原因：软件安装时会写入注册表、创建环境变量、安装依赖 VC++ 运行库等，直接复制 99% 无法运行。

### 🕳 坑 2：复制整个 AppData

**❌ 错误做法**：把 `C:\Users\关羽\AppData` 整个复制过去
**✅ 正确做法**：只按需取特定应用的配置子目录

> 原因：AppData 包含大量缓存和临时文件，版本号不同的软件读取旧配置可能崩溃。

### 🕳 坑 3：直接复制 Chrome / Edge 用户数据

**✅ 正确做法**：登录账号同步，或导出书签 HTML

> 原因：浏览器用户数据目录包含大量缓存、IndexedDB、Service Worker，复制过去可能导致浏览器闪退。账号同步最可靠。

### 🕳 坑 4：迁移后路径不对导致项目不能跑

**❌ 现象**：Node.js 项目 `npm start` 报错，因为路径硬编码了旧用户名
**✅ 解决办法**：
```powershell
# 如果新电脑用户名不同，检查项目配置文件是否有硬编码路径
gci -r -filter "*.json" -Path "C:\projects" | Select-String "C:\\Users\\旧用户名"
gci -r -filter "*.env*" -Path "C:\projects" | Select-String "C:\\Users\\旧用户名"
```

### 🕳 坑 5：微信聊天记录丢失

**❌ 错误做法**：只复制了微信安装目录
**✅ 正确做法**：复制的是 `文档/WeChat Files/` 整个文件夹，不是安装目录

> 微信聊天记录不在 Program Files 里，在「文档」目录下。

### 🕳 坑 6：迁移完发现文件只有快捷方式

**❌ 现象**：复制后发现大量 `.lnk` 快捷方式，文件本体没复制
**✅ 原因**：用户以为桌面图标就是文件，实际上很多是指向其他路径的快捷方式
**✅ 预防**：迁移前在旧电脑上右键查看每个桌面图标的「属性」→「目标」，确认是文件位置

### 🕳 坑 7：USB 弹出前拔掉硬盘

**❌ 后果**：文件复制到一半，部分文件损坏
**✅ 正确操作**：复制完成后，系统托盘 → 「安全删除硬件」→ 确认后再拔出

### 🕳 坑 8：新电脑用户名不同

如果你新电脑登录的 Microsoft 账号不同，用户文件夹名会变：

```
旧电脑：C:\Users\关羽
新电脑：C:\Users\GuanYu       # 如果拼音不同
```

这会导致：
- VS Code 配置路径不对（`settings.json` 里可能有绝对路径）
- 微信聊天记录需要放到新路径
- git 全局配置需要在新位置 `git config --global` 重新设置

**预防方法**：新电脑用旧电脑一样的账号登录，或迁移后修改项目配置。

### 🕳 坑 9：忘记导出 SSH Key 或 API Key 导致无法部署

**✅ 迁移前检查清单**：
```
□ GitHub Token（如有）
□ 云服务 API Key
□ SSH 私钥（~/.ssh/id_rsa）
□ 数据库连接串
□ VPN 配置文件
□ 环境变量中的密钥
```

将这些单独保存到密码管理器（Bitwarden/1Password/KeepassXC），不要只存在本地文件里。

### 🕳 坑 10：激活和许可证问题

```
□ Windows 激活：登录 Microsoft 账号后自动恢复（数字许可证）
□ Office：登录账号后激活，先在新电脑上解除旧电脑授权（如超限）
□ 付费软件：准备好序列号或购买凭证
□ Adobe 软件：登录 Creative Cloud 账号管理设备数
```

---

## ✅ 七、迁移完成后的检查清单

### 📁 数据完整性（必须逐项确认）

```text
□ 文档目录：打开几个随机文件确认内容正常
□ 图片目录：随机打开几张照片确认不损坏
□ 视频目录：随机播放几个视频
□ 微信记录：确认历史聊天记录可滚动查看
□ 最近文件：验证最近修改的文件已全部迁移
□ 文件数量：新旧电脑对比关键文件夹的文件数量
```

### 🔧 功能测试

```text
□ 浏览器打开常用网站，登录状态正常（收藏夹完好）
□ 微信发送/接收消息正常
□ VS Code 打开项目，扩展运行正常，代码高亮正确
□ 开发项目能 npm install / npm start
□ Git 能 commit / push
□ Office 文档能正常打开
□ 截图工具能正常使用
□ 输入法切换正常，词库完整
□ 打印机/扫描仪（如有）正常工作
□ 蓝牙设备（鼠标/键盘/耳机）连接正常
□ 外接显示器分辨率/缩放正确
□ 双屏扩展/复制模式正常

# 如果以上全部通过 → 迁移成功 ✅
```

### 🗑 旧电脑数据清理（等 1 个月后）

```text
□ 新电脑已稳定使用 ≥1 周不依赖旧电脑
□ 外接硬盘数据已全部复制到新电脑（硬盘可格式化做他用）
□ 旧电脑重要数据二次备份到外接硬盘
□ 旧电脑运行「重置此电脑」或安全擦除
□ 移除旧电脑在 Microsoft 账号中的信任设备
□ 从常用网站下线旧设备（Chrome、VS Code 同步等）
```

---

## 📎 附录

### A. 推荐工具清单

| 用途 | 推荐 | 原因 |
|------|------|------|
| 文件传输 | **外接 NTFS 硬盘** | 最稳定，可验证 |
| 密码管理 | **Bitwarden** | 免费开源，跨平台 |
| 截图 | **Snipaste** | 轻量、贴图功能强大 |
| 解压 | **NanaZip** | 开源，支持现代格式 |
| 搜索 | **Everything** | 秒级全盘搜索 |
| 启动器 | **PowerToys Run** | 微软出品，Alt+Space |

### B. 记住这个铁则

```
迁移不是复制粘贴。迁移 = 清理 + 按需搬运 + 重装 + 验证。

宁可慢，不要乱。
宁可留着旧电脑 1 个月不格式化，也不要急着清空。
```
