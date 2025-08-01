const form = document.getElementById('config-form');
const stopBtn = document.getElementById('stop-btn');
const logEl = document.getElementById('log');

let forwarding = false;
const MAX_LOG_LINES = 1000; // 设置日志显示的最大行数

// 向日志区域追加一条消息，并自动滚动到底部
function appendLog(msg) {
  const now = new Date().toLocaleTimeString();
  logEl.textContent += `[${now}] ${msg}\n`;

  // 检查并限制日志行数
  const lines = logEl.textContent.split('\n');
  if (lines.length > MAX_LOG_LINES) {
    // 移除最旧的日志行
    const newText = lines.slice(lines.length - MAX_LOG_LINES).join('\n');
    logEl.textContent = newText;
  }

  logEl.scrollTop = logEl.scrollHeight;
}

// 监听表单提交事件（启动转发）
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (forwarding) return;

  const listenPort = document.getElementById('listen-port').value;
  const targetIp = document.getElementById('target-ip').value;
  const targetPort = document.getElementById('target-port').value;

  appendLog(`请求启动转发：监听端口 ${listenPort} -> ${targetIp}:${targetPort}`);

  try {
    await window.electronAPI.startForward({
      listenPort: Number(listenPort),
      targetIp,
      targetPort: Number(targetPort)
    });
    forwarding = true;
    stopBtn.disabled = false;
    appendLog('转发已启动。');
  } catch (err) {
    appendLog('启动失败: ' + err.message);
  }
});

// 监听“停止转发”按钮点击事件
stopBtn.addEventListener('click', async () => {
  if (!forwarding) return;
  appendLog('请求停止转发...');
  try {
    await window.electronAPI.stopForward();
    forwarding = false;
    stopBtn.disabled = true;
    appendLog('转发已停止。');
  } catch (err) {
    appendLog('停止失败: ' + err.message);
  }
});

// 监听主进程推送的日志消息，并追加到日志区域
window.electronAPI.onForwardLog((event, logs) => {
  if (Array.isArray(logs)) {
    logs.forEach(msg => appendLog(msg));
  } else {
    appendLog(logs);
  }
});