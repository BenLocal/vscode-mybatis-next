import * as vscode from "vscode";
import { ParserManager } from "./parserManager";
import {
  JavaMapperCodelensProvider,
  XmlMapperCodelensProvider,
} from "./codelensProvider";
import { scanWorkspaceFiles } from "./scanWorkspace";
import { MappersStore } from "./mappersStore";
import { registerJava2XmlCommands } from "./java2XmlCommand";
import { registerXml2JavaCommands } from "./xml2JavaCommand";

let parserManager: ParserManager;
let javaMapperCodelensProvider: JavaMapperCodelensProvider;
let xmlMapperCodelensProvider: XmlMapperCodelensProvider;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "mybatis-next" is now active!');

  // Initialize parser manager
  parserManager = new ParserManager("tree-sitter");
  await parserManager.initialize(context);

  MappersStore.getInstance().initialize(context, parserManager);

  javaMapperCodelensProvider = new JavaMapperCodelensProvider();
  vscode.languages.registerCodeLensProvider(
    { language: "java" },
    javaMapperCodelensProvider
  );
  xmlMapperCodelensProvider = new XmlMapperCodelensProvider();
  vscode.languages.registerCodeLensProvider(
    { language: "xml" },
    xmlMapperCodelensProvider
  );

  registerCommands(context);
  createStatusBarItem(context);

  await scanWorkspaceFiles();
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Clean up resources if needed
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

function registerCommands(context: vscode.ExtensionContext) {
  // Add command to test parsing
  const parseCommand = vscode.commands.registerCommand(
    "mybatis-next.testParse",
    () => {
      javaMapperCodelensProvider.fire();
    }
  );

  context.subscriptions.push(parseCommand);

  registerJava2XmlCommands(context);
  registerXml2JavaCommands(context);
}

function createStatusBarItem(context: vscode.ExtensionContext) {
  // 创建状态栏项
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  // 设置状态栏项属性
  statusBarItem.text = "MyBatis Next";
  statusBarItem.tooltip = "MyBatis Next - 点击查看映射信息";
  statusBarItem.command = "mybatis-next.showMappersInfo";

  // 注册命令
  const showMappersCommand = vscode.commands.registerCommand(
    "mybatis-next.showMappersInfo",
    () => {
      const mappersStore = MappersStore.getInstance();
      const counts = mappersStore.getMappersCount();

      const message = `找到 ${counts.xmlCount} 个 XML 映射文件和 ${counts.javaCount} 个 Java 接口文件`;
      vscode.window.showInformationMessage(message);
    }
  );

  context.subscriptions.push(showMappersCommand);
  context.subscriptions.push(statusBarItem);

  // 显示状态栏项
  statusBarItem.show();

  // 监听文件变化，更新状态栏
  const fileWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
    //updateStatusBar();
  });

  const workspaceWatcher = vscode.workspace.onDidSaveTextDocument((document) => {
    //updateStatusBar();
  });

  context.subscriptions.push(fileWatcher);
  context.subscriptions.push(workspaceWatcher);
}
