const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const dgram = require('node:dgram');

let udpServer = null;
let forwarding = false;
let mainWindow = null;
let logBuffer = [];
let logTimer = null;

// 创建主窗口
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();
}

// 向日志缓冲区追加一条消息
function addLogToBuffer(msg) {
  logBuffer.push(msg);
}

// 启动批量发送日志的定时器
function startLogTimer() {
  if (logTimer) return;
  // 每 200 毫秒将缓冲区日志批量发送给渲染进程
  logTimer = setInterval(() => {
    if (mainWindow && logBuffer.length > 0) {
      mainWindow.webContents.send('forward-log', logBuffer);
      logBuffer = [];
    }
  }, 200);
}

// 停止批量发送日志的定时器
function stopLogTimer() {
  if (logTimer) {
    clearInterval(logTimer);
    logTimer = null;
    if (mainWindow && logBuffer.length > 0) {
      mainWindow.webContents.send('forward-log', logBuffer);
      logBuffer = [];
    }
  }
}

// 启动 UDP 数据包转发
async function startForward({ listenPort, targetIp, targetPort }) {
  if (forwarding) throw new Error('转发已在运行');
  udpServer = dgram.createSocket('udp4');

  udpServer.on('error', (err) => {
    addLogToBuffer('UDP服务器错误: ' + err.message);
    udpServer.close();
    udpServer = null;
    forwarding = false;
    stopLogTimer();
  });

  udpServer.on('message', (msg, rinfo) => {
    udpServer.send(msg, targetPort, targetIp, (err) => {
      if (err) addLogToBuffer('转发失败: ' + err.message);
    });
    addLogToBuffer(`收到来自${rinfo.address}:${rinfo.port}的数据，转发到${targetIp}:${targetPort}`);
  });

  udpServer.on('listening', () => {
    const address = udpServer.address();
    addLogToBuffer(`UDP服务器监听在端口 ${address.port}`);
    forwarding = true;
    startLogTimer();
  });

  udpServer.bind(listenPort);
}

// 停止 UDP 数据包转发
async function stopForward() {
  if (!forwarding || !udpServer) throw new Error('转发未启动');
  udpServer.close();
  udpServer = null;
  forwarding = false;
  addLogToBuffer('UDP转发已停止');
  stopLogTimer();
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    stopForward();
    app.quit();
  }
});

ipcMain.handle('start-forward', async (event, args) => {
  await startForward(args);
});

ipcMain.handle('stop-forward', async () => {
  await stopForward();
});