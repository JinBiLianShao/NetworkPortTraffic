const { app, BrowserWindow, ipcMain } = require('electron'); // 引入 Electron 主进程相关模块
const path = require('node:path'); // Node.js 路径处理模块
const dgram = require('node:dgram'); // Node.js UDP 数据报模块

let udpServer = null;      // UDP 服务器实例
let forwarding = false;    // 是否正在转发
let mainWindow = null;     // 主窗口实例

// 创建主窗口
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800, // 窗口宽度
    height: 600, // 窗口高度
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 预加载脚本
      contextIsolation: true, // 启用上下文隔离，提升安全性
      nodeIntegration: false, // 禁用 Node 集成，提升安全性
    }
  });
  mainWindow.loadFile('index.html'); // 加载主页面
  // mainWindow.webContents.openDevTools(); // 可选：打开开发者工具
}

// 向渲染进程发送日志消息
function sendLog(msg) {
  if (mainWindow) {
    mainWindow.webContents.send('forward-log', msg);
  }
}

// 启动 UDP 数据包转发
async function startForward({ listenPort, targetIp, targetPort }) {
  if (forwarding) throw new Error('转发已在运行');
  udpServer = dgram.createSocket('udp4'); // 创建 UDP4 socket

  // 监听 UDP 服务器错误事件
  udpServer.on('error', (err) => {
    sendLog('UDP服务器错误: ' + err.message);
    udpServer.close();
    udpServer = null;
    forwarding = false;
  });

  // 监听收到 UDP 消息事件
  udpServer.on('message', (msg, rinfo) => {
    sendLog(`收到来自${rinfo.address}:${rinfo.port}的数据，转发到${targetIp}:${targetPort}`);
    // 将收到的数据包转发到目标 IP 和端口
    udpServer.send(msg, targetPort, targetIp, (err) => {
      if (err) sendLog('转发失败: ' + err.message);
    });
  });

  // 监听 UDP 服务器启动监听事件
  udpServer.on('listening', () => {
    const address = udpServer.address();
    sendLog(`UDP服务器监听在端口 ${address.port}`);
    forwarding = true;
  });

  udpServer.bind(listenPort); // 绑定监听端口
}

// 停止 UDP 数据包转发
async function stopForward() {
  if (!forwarding || !udpServer) throw new Error('转发未启动');
  udpServer.close(); // 关闭 UDP 服务器
  udpServer = null;
  forwarding = false;
  sendLog('UDP转发已停止');
}

// 应用启动时创建窗口
app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    // macOS 下点击 Dock 图标时无窗口则重新创建
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') 
    {
      stopForward();
      app.quit();
    }
});

// 处理渲染进程发来的“启动转发”请求
ipcMain.handle('start-forward', async (event, args) => {
  await startForward(args);
});
// 处理渲染进程发来的“停止转发”请求
ipcMain.handle('stop-forward', async () => {
  await stopForward();
});