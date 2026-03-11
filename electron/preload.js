const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform:  process.platform,
  isElectron: true,

  // Backup history — persists across app restarts
  getBackupHistory:    ()      => ipcRenderer.invoke('get-backup-history'),
  addBackupHistory:    (entry) => ipcRenderer.invoke('add-backup-history', entry),
  deleteBackupHistory: (id)    => ipcRenderer.invoke('delete-backup-history', id),
  clearBackupHistory:  ()      => ipcRenderer.invoke('clear-backup-history'),

  // App info
  getAppMode: () => ipcRenderer.invoke('get-app-mode'),
  onAppModeChanged: (cb) => ipcRenderer.on('app-mode-changed', (_evt, data) => cb(data)),
  onShowNotification: (cb) => ipcRenderer.on('show-notification', (_evt, data) => cb(data)),
});
