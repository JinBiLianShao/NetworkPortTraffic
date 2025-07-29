const form = document.getElementById('config-form');      // 获取表单元素
const stopBtn = document.getElementById('stop-btn');      // 获取“停止转发”按钮
const logEl = document.getElementById('log');             // 获取日志显示区域

let forwarding = false; // 标记当前是否正在转发

// 向日志区域追加一条消息，并自动滚动到底部
function appendLog(msg) {
  const now = new Date().toLocaleTimeString(); // 获取当前时间
  logEl.textContent += `[${now}] ${msg}\n`;    // 格式化日志输出
  logEl.scrollTop = logEl.scrollHeight;        // 滚动到底部
}

// 监听表单提交事件（启动转发）
form.addEventListener('submit', async (e) => {
  e.preventDefault();           // 阻止表单默认提交行为
  if (forwarding) return;       // 如果已在转发，直接返回

  // 获取用户输入的端口和目标信息
  const listenPort = document.getElementById('listen-port').value;
  const targetIp = document.getElementById('target-ip').value;
  const targetPort = document.getElementById('target-port').value;

  appendLog(`请求启动转发：监听端口 ${listenPort} -> ${targetIp}:${targetPort}`);

  try {
    // 调用主进程暴露的API，启动UDP转发
    await window.electronAPI.startForward({
      listenPort: Number(listenPort),
      targetIp,
      targetPort: Number(targetPort)
    });
    forwarding = true;           // 标记为已转发
    stopBtn.disabled = false;    // 启用“停止转发”按钮
    appendLog('转发已启动。');
  } catch (err) {
    appendLog('启动失败: ' + err.message); // 启动失败时输出错误信息
  }
});

// 监听“停止转发”按钮点击事件
stopBtn.addEventListener('click', async () => {
  if (!forwarding) return;      // 如果未转发，直接返回
  appendLog('请求停止转发...');
  try {
    // 调用主进程暴露的API，停止UDP转发
    await window.electronAPI.stopForward();
    forwarding = false;         // 标记为未转发
    stopBtn.disabled = true;    // 禁用“停止转发”按钮
    appendLog('转发已停止。');
  } catch (err) {
    appendLog('停止失败: ' + err.message); // 停止失败时输出错误信息
  }
});

// 监听主进程推送的日志消息，并追加到日志区域
window.electronAPI.onForwardLog((event, msg) => {
  appendLog(msg);
});