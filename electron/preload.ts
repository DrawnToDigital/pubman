import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
    on: (channel: string, listener: (event: any, ...args: any[]) => void) =>
      ipcRenderer.on(channel, listener),
  },
  dialog: {
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke("dialog:openFile", options),
    showMessageBoxSync: (options: Electron.MessageBoxSyncOptions) =>
      ipcRenderer.invoke("dialog:showMessageBoxSync", options),
  },
  fs: {
    stat: (filePath: string) => ipcRenderer.invoke("fs:stat", filePath),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke("shell:showItemInFolder", filePath),
  },
  makerworld: {
    auth: () => ipcRenderer.invoke("makerworld:auth"),
    logout: () => ipcRenderer.invoke("makerworld:logout"),
  },
  getDBPath: () => ipcRenderer.invoke("get-db-path"),
  getAppDataPath: () => ipcRenderer.invoke("get-app-data-path"),
});