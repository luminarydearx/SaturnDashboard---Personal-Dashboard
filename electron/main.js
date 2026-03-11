const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron');
const path   = require('path');
const { spawn } = require('child_process');
const http   = require('http');
const fs     = require('fs');

let mainWindow;
let splashWindow;
let nextProcess;

const PORT          = 3456;
const MAX_WAIT_MS   = 120_000;
const POLL_INTERVAL = 600;

// ─── Splash: frameless, centered, small, no window chrome ────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width:       360,
    height:      300,
    frame:       false,        // ← no title bar, no X/minimize/maximize
    transparent: true,         // ← transparent so rounded corners show
    resizable:   false,
    movable:     true,
    center:      true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  splashWindow.loadFile(path.join(__dirname, 'loading.html'));
  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.show();
  });
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
}

// ─── Main window ──────────────────────────────────────────────────────────
function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 900, minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
    backgroundColor: '#04040d',
    icon: path.join(__dirname, '../public/logo.png'),
    title: 'Saturn Dashboard',
    show: false,  // hidden until server ready
  });

  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── Wait for server ─────────────────────────────────────────────────────
function waitForServer(port, onReady, onTimeout) {
  const deadline = Date.now() + MAX_WAIT_MS;
  let attempts = 0;

  const check = () => {
    attempts++;
    const req = http.get(`http://127.0.0.1:${port}`, { timeout: 1000 }, (res) => {
      res.resume();
      onReady();
    });
    req.on('error', () => {
      if (Date.now() < deadline) setTimeout(check, POLL_INTERVAL);
      else onTimeout(attempts);
    });
    req.on('timeout', () => {
      req.destroy();
      if (Date.now() < deadline) setTimeout(check, POLL_INTERVAL);
      else onTimeout(attempts);
    });
  };

  setTimeout(check, 300);
}

// ─── Find next binary ─────────────────────────────────────────────────────
function findNextBin() {
  const cwd = path.join(__dirname, '..');
  const name = process.platform === 'win32' ? 'next.cmd' : 'next';
  const bin1 = path.join(cwd, 'node_modules', '.bin', name);
  if (fs.existsSync(bin1)) return { cmd: bin1, args: ['start', '-p', String(PORT)] };
  const bin2 = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (fs.existsSync(bin2)) return { cmd: process.execPath, args: [bin2, 'start', '-p', String(PORT)] };
  return null;
}

// ─── Backup history persistence ───────────────────────────────────────────
const BACKUP_HISTORY_FILE = path.join(app.getPath('userData'), 'saturn-backup-history.json');

function readBackupHistory() {
  try {
    if (fs.existsSync(BACKUP_HISTORY_FILE))
      return JSON.parse(fs.readFileSync(BACKUP_HISTORY_FILE, 'utf8'));
  } catch (e) { console.error('Backup history read error:', e); }
  return [];
}

function writeBackupHistory(data) {
  try { fs.writeFileSync(BACKUP_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error('Backup history write error:', e); }
}

ipcMain.handle('get-backup-history',    ()      => readBackupHistory());
ipcMain.handle('clear-backup-history',  ()      => { writeBackupHistory([]); return []; });
ipcMain.handle('delete-backup-history', (_, id) => {
  const h = readBackupHistory().filter(x => x.id !== id);
  writeBackupHistory(h); return h;
});
ipcMain.handle('add-backup-history', (_, entry) => {
  const h = readBackupHistory();
  const idx = h.findIndex(x => x.id === entry.id);
  if (idx >= 0) h[idx] = entry; else h.unshift(entry);
  const trimmed = h.slice(0, 200);
  writeBackupHistory(trimmed); return trimmed;
});

ipcMain.handle('get-app-mode', () => ({
  isPackaged: app.isPackaged,
  version: app.getVersion?.() || 'dev',
  platform: process.platform,
}));

// ─── App ready ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  createSplash();  // show small frameless loading splash
  createWindow();  // create main window (hidden)

  const goToApp = (url) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.loadURL(url)
      .then(() => {
        closeSplash();
        mainWindow.show();
        mainWindow.focus();
      })
      .catch(err => {
        console.error('Failed to load:', err);
        closeSplash();
        mainWindow.show();
      });
  };

  const handleFail = (attempts) => {
    closeSplash();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    dialog.showErrorBox(
      'Server Gagal Start',
      `Saturn Dashboard tidak berhasil terhubung setelah ${attempts} percobaan.\n\n` +
      `Pastikan kamu sudah build: npm run build\nPort: ${PORT}`
    );
    app.quit();
  };

  if (isDev) {
    waitForServer(3000,
      () => goToApp('http://localhost:3000'),
      () => waitForServer(PORT, () => goToApp(`http://localhost:${PORT}`), handleFail)
    );
  } else {
    const nextCmd = findNextBin();
    if (!nextCmd) { handleFail(0); return; }

    const cwd = path.join(__dirname, '..');
    nextProcess = spawn(nextCmd.cmd, nextCmd.args, {
      cwd,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
      stdio: 'pipe',
      detached: false,
      shell: process.platform === 'win32',
    });

    nextProcess.stdout?.on('data', d => console.log('[next]', d.toString().trim()));
    nextProcess.stderr?.on('data', d => console.error('[next err]', d.toString().trim()));
    nextProcess.on('error', err => console.error('[spawn error]', err));
    nextProcess.on('exit', code => { console.log('[next exit]', code); nextProcess = null; });

    waitForServer(PORT, () => goToApp(`http://localhost:${PORT}`), handleFail);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { createSplash(); createWindow(); }
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────
const killNext = () => {
  if (nextProcess && !nextProcess.killed) {
    if (process.platform === 'win32' && nextProcess.pid) {
      try { spawn('taskkill', ['/pid', String(nextProcess.pid), '/f', '/t'], { detached: false, stdio: 'ignore' }); }
      catch(e) { console.error('taskkill failed:', e); }
    } else if (nextProcess.pid) {
      try { process.kill(-nextProcess.pid, 'SIGTERM'); }
      catch(e) { nextProcess.kill('SIGTERM'); }
    }
    nextProcess = null;
  }
};

app.on('window-all-closed', () => { killNext(); if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', killNext);
process.on('SIGTERM', killNext);
process.on('SIGINT',  killNext);
