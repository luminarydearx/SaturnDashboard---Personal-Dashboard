const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path   = require('path');
const { spawn } = require('child_process');
const http   = require('http');
const fs     = require('fs');

let mainWindow;
let nextProcess;

const PORT          = 3456;
const MAX_WAIT_MS   = 120_000; // 2 menit
const POLL_INTERVAL = 600;     // cek tiap 600ms

// ─── Buat jendela utama ───────────────────────────────────────────────────
function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
    backgroundColor: '#04040d',
    icon: path.join(__dirname, '../public/logo.png'),
    title: 'Saturn Dashboard',
    show: true, // Langsung tampil — loading.html yg jadi splash
  });

  // Nonaktifkan klik kanan
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  // Buka link eksternal di browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Tampilkan loading.html dulu (loading screen kamu yg keren)
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  return mainWindow;
}

// ─── Poll sampai Next.js server siap ─────────────────────────────────────
function waitForServer(port, onReady, onTimeout) {
  const deadline = Date.now() + MAX_WAIT_MS;
  let   attempts = 0;

  const check = () => {
    attempts++;
    const req = http.get(`http://127.0.0.1:${port}`, { timeout: 1000 }, (res) => {
      // Respons apapun berarti server sudah jalan
      res.resume(); // buang body supaya tidak hang
      onReady();
    });

    req.on('error', () => {
      if (Date.now() < deadline) {
        setTimeout(check, POLL_INTERVAL);
      } else {
        onTimeout(attempts);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (Date.now() < deadline) {
        setTimeout(check, POLL_INTERVAL);
      } else {
        onTimeout(attempts);
      }
    });
  };

  // Mulai cek setelah sedikit delay agar Next.js sempat boot
  setTimeout(check, 300);
}

// ─── Cari binary next ─────────────────────────────────────────────────────
function findNextBin() {
  const cwd = path.join(__dirname, '..');

  // 1. node_modules/.bin/next (symlink)
  const bin1 = path.join(cwd, 'node_modules', '.bin', 'next');
  if (fs.existsSync(bin1)) return { cmd: bin1, args: ['start', '-p', String(PORT)] };

  // 2. next dist/bin (jalankan lewat node)
  const bin2 = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (fs.existsSync(bin2)) return { cmd: process.execPath, args: [bin2, 'start', '-p', String(PORT)] };

  return null;
}

// ─── Start ───────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  createWindow();

  // Ketika server siap → navigasi dari loading.html ke app
  const goToApp = (url) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(url);
    }
  };

  const handleFail = (attempts) => {
    dialog.showErrorBox(
      'Server Gagal Start',
      `Saturn Dashboard tidak berhasil terhubung setelah ${attempts} percobaan.\n\n` +
      `Pastikan kamu sudah build: npm run build\n` +
      `Port yang digunakan: ${PORT}`
    );
    app.quit();
  };

  if (isDev) {
    // Dev mode: asumsi next dev sudah jalan di port 3000
    waitForServer(
      3000,
      () => goToApp('http://localhost:3000'),
      // Fallback ke port lain jika 3000 tidak respons
      () => waitForServer(PORT, () => goToApp(`http://localhost:${PORT}`), handleFail)
    );
  } else {
    // Production: spawn next start
    const nextCmd = findNextBin();
    if (!nextCmd) {
      handleFail(0);
      return;
    }

    const cwd = path.join(__dirname, '..');
    nextProcess = spawn(nextCmd.cmd, nextCmd.args, {
      cwd,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: 'production',
      },
      stdio: 'pipe',
      detached: false,
    });

    nextProcess.stdout?.on('data', (d) => console.log('[next]', d.toString().trim()));
    nextProcess.stderr?.on('data', (d) => console.error('[next err]', d.toString().trim()));
    nextProcess.on('error', (err) => console.error('[spawn error]', err));
    nextProcess.on('exit', (code) => {
      console.log('[next exit]', code);
    });

    // Poll sampai server siap
    waitForServer(PORT, () => goToApp(`http://localhost:${PORT}`), handleFail);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────
const killNext = () => {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM');
    nextProcess = null;
  }
};

app.on('window-all-closed', () => {
  killNext();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', killNext);
process.on('SIGTERM', killNext);
