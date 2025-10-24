import * as vscode from "vscode";
import { TreeSitterManager } from "./treeSitterManager";
import { JavaMapperCodelensProvider } from "./codelensProvider";
import { JavaMethodInfo } from "./javaAnalyzer";

let treeSitterManager: TreeSitterManager;
let javaMapperCodelensProvider: JavaMapperCodelensProvider;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "mybatis-next" is now active!');

  // Initialize Tree-sitter
  treeSitterManager = new TreeSitterManager();
  await treeSitterManager.initialize(context);

  javaMapperCodelensProvider = new JavaMapperCodelensProvider(
    treeSitterManager
  );
  vscode.languages.registerCodeLensProvider(
    { language: "java" },
    javaMapperCodelensProvider
  );

  registerCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Clean up resources if needed
}

function registerCommands(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "mybatis-next.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello World from vscode-mybatis-next!"
      );
    }
  );

  // 显示方法信息的命令
  const showMethodInfoCommand = vscode.commands.registerCommand(
    "mybatis-next.showMethodInfo",
    (methodInfo: JavaMethodInfo) => {
      const modifiers = [];
      if (methodInfo.isPublic) {
        modifiers.push("public");
      }
      if (methodInfo.isPrivate) {
        modifiers.push("private");
      }
      if (methodInfo.isProtected) {
        modifiers.push("protected");
      }
      if (methodInfo.isStatic) {
        modifiers.push("static");
      }
      if (methodInfo.isAbstract) {
        modifiers.push("abstract");
      }

      const message = [
        `方法名: ${methodInfo.name}`,
        `返回类型: ${methodInfo.returnType || "void"}`,
        `参数: ${methodInfo.parameters.join(", ") || "无"}`,
        `修饰符: ${modifiers.join(" ") || "default"}`,
        `位置: 第${methodInfo.startLine}行, 第${methodInfo.startColumn}列`,
        `结束位置: 第${methodInfo.endLine}行, 第${methodInfo.endColumn}列`,
      ].join("\n");

      vscode.window.showInformationMessage(message);
    }
  );

  // Add command to test parsing
  const parseCommand = vscode.commands.registerCommand(
    "mybatis-next.testParse",
    () => {
      javaMapperCodelensProvider.fire();
    }
  );

  context.subscriptions.push(disposable, showMethodInfoCommand, parseCommand);
}
