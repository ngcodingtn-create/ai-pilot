const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aipilotManager", {
  getDefaults: () => ipcRenderer.invoke("manager:get-defaults"),
  getUpdateState: () => ipcRenderer.invoke("manager:get-update-state"),
  configureUpdates: (payload) =>
    ipcRenderer.invoke("manager:configure-updates", payload),
  checkForUpdates: () => ipcRenderer.invoke("manager:check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("manager:install-update"),
  pickProjectDirectory: () => ipcRenderer.invoke("manager:pick-project-directory"),
  createSession: (payload) => ipcRenderer.invoke("manager:create-session", payload),
  runAction: (payload) => ipcRenderer.invoke("manager:run-action", payload),
  openExternal: (url) => ipcRenderer.invoke("manager:open-external", url),
  onUpdateState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("manager:update-state", listener);

    return () => {
      ipcRenderer.removeListener("manager:update-state", listener);
    };
  },
});
