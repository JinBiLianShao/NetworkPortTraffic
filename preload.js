/**
 * 该 preload 脚本会在 index.html 加载前运行于渲染进程。
 * 它可以访问 Web API、Electron 渲染进程模块以及部分 Node.js 能力（受限）。
 * 主要作用是安全地将主进程能力暴露给渲染进程。
 * 参考：https://www.electronjs.org/docs/latest/tutorial/sandbox
 */

// 示例：页面加载后，替换页面上特定元素的文本为当前运行环境的版本号
window.addEventListener('DOMContentLoaded', () => {
  // 替换指定 id 元素的文本内容
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  // 替换 chrome、node、electron 版本号（如页面有这些 id）
  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

// 引入 Electron 提供的 contextBridge 和 ipcRenderer 模块
const { contextBridge, ipcRenderer } = require('electron');

// 使用 contextBridge 安全地将主进程能力暴露到 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // 启动 UDP 转发，参数为配置对象，返回 Promise
  startForward: (config) => ipcRenderer.invoke('start-forward', config),
  // 停止 UDP 转发，返回 Promise
  stopForward: () => ipcRenderer.invoke('stop-forward'),
  // 监听主进程推送的日志消息，回调参数为 (event, msg)
  onForwardLog: (callback) => ipcRenderer.on('forward-log', callback)
});