# Web Loader

一个基于 Electron 的桌面应用，用于访问目标网页并将会话期间加载的所有资源一次性导出至本地目录。主要面向 H5 游戏资源抓取与归档场景。

## 📖 功能特性

### 🎯 核心功能
- **网页浏览**：内置浏览器，支持固定尺寸显示区域（720×1280）
- **资源捕获**：实时捕获页面加载的所有静态资源
- **批量导出**：一键导出所有捕获的资源到本地目录
- **资源管理**：提供资源列表、统计、进度跟踪等功能

### 🔧 技术特性
- **多种资源类型支持**：HTML、CSS、JavaScript、图片、字体、音频、JSON 等
- **智能路径映射**：按原始 URL 路径层级组织，第三方资源归类到 `external/<host>/` 目录
- **去重机制**：基于 URL 归一化的去重策略
- **暂停/恢复**：支持捕获过程的暂停和恢复
- **实时统计**：实时显示捕获进度、成功/失败数量、文件大小等

## 🖥️ 界面布局

应用采用固定布局设计，确保最佳的资源捕获体验：

- **窗口尺寸**：1080×1380（可水平拉伸）
- **URL 输入区**：720×100，包含输入框和确定按钮
- **网页显示区**：720×1280，固定尺寸不变形
- **控制面板**：360×1380，包含导出设置、捕获控制、资源列表和统计信息

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm（推荐）或 npm

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 开发运行

```bash
# 启动开发模式
pnpm dev

# 或
npm run dev
```

### 构建打包

```bash
# 类型检查
pnpm typecheck

# 构建项目
pnpm build

# 打包 Windows 版本
pnpm pack:win

# 打包 macOS 版本
pnpm pack:mac

# 打包 Linux 版本
pnpm pack:linux
```

## 📋 使用说明

### 基本工作流程

1. **输入 URL**：在顶部输入框中输入目标网页地址
2. **开始捕获**：点击"确定"按钮开始导航并启动资源捕获
3. **监控进度**：在右侧面板查看实时捕获统计和资源列表
4. **控制捕获**：使用暂停/继续/停止按钮控制捕获过程
5. **导出资源**：选择导出目录并点击"导出"按钮完成资源导出

### 状态管理

应用具有以下几种状态：

- **Idle**：空闲状态，未开始捕获
- **Capturing**：正在捕获资源
- **Paused**：捕获已暂停
- **Exporting**：正在导出资源

### 资源类型

支持捕获以下类型的资源：

- **文档**：HTML 文件
- **样式表**：CSS 文件
- **脚本**：JavaScript 文件
- **图片**：PNG、JPG、WebP、GIF、SVG 等
- **字体**：WOFF、WOFF2、TTF、OTF 等
- **音频**：MP3、M4A、OGG 等
- **数据**：JSON、XHR 响应等

### 导出规则

#### 目录结构
- **主域资源**：按原始 URL 路径层级保存
- **第三方资源**：保存到 `external/<域名>/` 目录下
- **查询参数**：对查询字符串计算哈希值，作为文件名后缀

## 🛠️ 技术架构

### 技术栈

- **桌面框架**：Electron 29
- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite + electron-vite
- **UI 组件**：Radix UI + Tailwind CSS
- **状态管理**：React Hooks
- **文件操作**：fs-extra
- **数据持久化**：electron-store

### 核心模块

#### 主进程模块
- **ResourceCaptureService**：资源捕获服务
- **ExportService**：资源导出服务
- **UrlNormalizer**：URL 标准化处理
- **SettingsStore**：设置数据存储
- **SessionManager**：会话管理

#### 渲染进程模块
- **App**：主应用组件
- **Toolbar**：工具栏组件
- **ControlCard**：捕获控制面板
- **ExportCard**：导出设置面板
- **StatsCard**：统计信息面板
- **ProgressCard**：进度显示面板

### 数据结构

```typescript
// 资源记录
interface ResourceRecord {
  id: string;
  type: ResourceType;
  url: string;
  normalized: NormalizedUrl;
  method: 'GET' | 'POST' | 'OTHER';
  statusCode?: number;
  mimeType?: string;
  contentLength?: number;
  sizeOnDisk?: number;
  startedAt: number;
  finishedAt?: number;
  state: 'in-progress' | 'success' | 'failed' | 'skipped';
  // ... 其他字段
}

// 捕获会话
interface CaptureSession {
  sessionId: string;
  partition: string;
  startedAt: number;
  state: 'idle' | 'capturing' | 'paused' | 'exporting';
  tempDir: string;
}
```

## ⚙️ 配置选项

应用支持以下配置项（通过 electron-store 持久化）：

- **导出路径**：默认导出目录
- **并发设置**：同时下载的资源数量限制
- **界面设置**：窗口尺寸、面板宽度等
- **过滤设置**：默认的资源类型过滤规则
- **性能设置**：UI 刷新频率、缓存清理策略等
