const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aipilotManager", {
  getDefaults: () => ipcRenderer.invoke("manager:get-defaults"),
  getUpdateState: () => ipcRenderer.invoke("manager:get-update-state"),
  getDesktopAppStatus: (environment) =>
    ipcRenderer.invoke("manager:get-desktop-app-status", environment),
  configureUpdates: (payload) =>
    ipcRenderer.invoke("manager:configure-updates", payload),
  checkForUpdates: () => ipcRenderer.invoke("manager:check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("manager:install-update"),
  pickProjectDirectory: () => ipcRenderer.invoke("manager:pick-project-directory"),
  createSession: (payload) => ipcRenderer.invoke("manager:create-session", payload),
  saveState: (payload) => ipcRenderer.invoke("manager:save-state", payload),
  runAction: (payload) => ipcRenderer.invoke("manager:run-action", payload),
  openExternal: (url) => ipcRenderer.invoke("manager:open-external", url),
  openPath: (targetPath) => ipcRenderer.invoke("manager:open-path", targetPath),
  onActionLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("manager:action-log", listener);

    return () => {
      ipcRenderer.removeListener("manager:action-log", listener);
    };
  },
  onUpdateState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("manager:update-state", listener);

    return () => {
      ipcRenderer.removeListener("manager:update-state", listener);
    };
  },
});
