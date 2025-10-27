import * as vscode from "vscode";

export function createMockExtensionContext(): vscode.ExtensionContext {
  const mockUri = vscode.Uri.file(__dirname);

  return {
    extensionUri: mockUri,
    extensionPath: __dirname,
    subscriptions: [],
    workspaceState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      keys: () => []
    } as any,
    globalState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      keys: () => []
    } as any,
    secrets: {
      get: () => Promise.resolve(undefined),
      store: () => Promise.resolve(),
      delete: () => Promise.resolve()
    } as any,
    extension: {} as any,
    environmentVariableCollection: {} as any,
    logUri: mockUri,
    logPath: __dirname,
    storageUri: mockUri,
    storagePath: __dirname,
    globalStorageUri: mockUri,
    globalStoragePath: __dirname,
    extensionMode: vscode.ExtensionMode.Test,
    asAbsolutePath: (relativePath: string) => relativePath,
    languageModelAccessInformation: {} as any,
  };
}

export function createMockExtensionContextWithCustomUri(uri: vscode.Uri): vscode.ExtensionContext {
  return {
    extensionUri: uri,
    extensionPath: uri.fsPath,
    subscriptions: [],
    workspaceState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      keys: () => []
    } as any,
    globalState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      keys: () => []
    } as any,
    secrets: {
      get: () => Promise.resolve(undefined),
      store: () => Promise.resolve(),
      delete: () => Promise.resolve()
    } as any,
    extension: {} as any,
    environmentVariableCollection: {} as any,
    logUri: uri,
    logPath: uri.fsPath,
    storageUri: uri,
    storagePath: uri.fsPath,
    globalStorageUri: uri,
    globalStoragePath: uri.fsPath,
    extensionMode: vscode.ExtensionMode.Test,
    asAbsolutePath: (relativePath: string) => relativePath,
    languageModelAccessInformation: {} as any,
  };
}
