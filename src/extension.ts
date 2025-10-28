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
import { OutputLogger } from "./outputLogs";

let parserManager: ParserManager;
let javaMapperCodelensProvider: JavaMapperCodelensProvider;
let xmlMapperCodelensProvider: XmlMapperCodelensProvider;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  OutputLogger.initialize(context);
  OutputLogger.info("MyBatis Next extension activated", "EXTENSION");

  // Initialize parser manager
  parserManager = new ParserManager();
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

  scanWorkspaceFiles();
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
    "mybatis-next.reset",
    async () => {
      MappersStore.getInstance().cleanup();
      vscode.window.setStatusBarMessage("Mybatis.Next: clean success", 3000);
      scanWorkspaceFiles();
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

      // display output logs
      OutputLogger.show();
    }
  );

  context.subscriptions.push(showMappersCommand, statusBarItem);

  // 显示状态栏项
  statusBarItem.show();
}
