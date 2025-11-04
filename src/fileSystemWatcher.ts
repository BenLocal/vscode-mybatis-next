import * as vscode from "vscode";
import { OutputLogger } from "./outputLogs";
import { MappersStore } from "./mappersStore";

export class MybatisFileSystemWatcher {
  private readonly _javaWatcher: vscode.FileSystemWatcher;
  private readonly _xmlWatcher: vscode.FileSystemWatcher;

  public constructor() {
    this._javaWatcher = vscode.workspace.createFileSystemWatcher("**/*.java");
    this._xmlWatcher = vscode.workspace.createFileSystemWatcher("**/*.xml");
  }

  public async initialize(context: vscode.ExtensionContext) {
    this._javaWatcher.onDidCreate(async (uri) => {
      OutputLogger.info(`Java file created: ${uri.fsPath}`, "FILE_WATCHER");
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        await MappersStore.getInstance().addJavaFile(uri, document);
        OutputLogger.info(
          `Successfully processed new Java file: ${uri.fsPath}`,
          "FILE_WATCHER"
        );
      } catch (error) {
        OutputLogger.errorWithStackTrace(
          `Error processing new Java file`,
          error as Error,
          "FILE_WATCHER"
        );
      }
    });
    this._javaWatcher.onDidDelete(async (uri) => {
      OutputLogger.info(`Java file deleted: ${uri.fsPath}`, "FILE_WATCHER");
      try {
        await MappersStore.getInstance().removeJavaFile(uri);
      } catch (error) {
        OutputLogger.errorWithStackTrace(
          `Error processing deleted Java file`,
          error as Error,
          "FILE_WATCHER"
        );
      }
    });

    this._xmlWatcher.onDidCreate(async (uri) => {
      OutputLogger.info(`XML file created: ${uri.fsPath}`, "FILE_WATCHER");
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        await MappersStore.getInstance().addXmlFile(uri, document);
      } catch (error) {
        OutputLogger.errorWithStackTrace(
          `Error processing new XML file`,
          error as Error,
          "FILE_WATCHER"
        );
      }
    });

    this._xmlWatcher.onDidDelete(async (uri) => {
      OutputLogger.info(`XML file deleted: ${uri.fsPath}`, "FILE_WATCHER");
      try {
        await MappersStore.getInstance().removeXmlFile(uri);
      } catch (error) {
        OutputLogger.errorWithStackTrace(
          `Error processing deleted XML file`,
          error as Error,
          "FILE_WATCHER"
        );
      }
    });

    context.subscriptions.push(this._javaWatcher, this._xmlWatcher);
  }
}
