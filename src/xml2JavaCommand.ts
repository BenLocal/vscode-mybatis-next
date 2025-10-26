import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { MyBatisUtils } from "./mybatisUtils";

export function registerXml2JavaCommands(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "mybatis-next.xml2Java",
    async (xmlFilePath: string, namespace: string, id: string) => {
      try {
        const javaFile = MappersStore.getInstance().selectBestJavaFile(
          xmlFilePath,
          namespace
        );
        if (!javaFile) {
          return;
        }
        const fileUri = MyBatisUtils.getFilePath(javaFile.file);
        const javaDocument = await vscode.workspace.openTextDocument(fileUri);
        const javaEditor = await vscode.window.showTextDocument(javaDocument);
        // 在xml文件中查找方法名对应的sql语句
        const method = javaFile.info.methods.find(
          (method) => method.name === id
        );
        if (!method) {
          return;
        }
        const startPosition = new vscode.Position(
          method.startLine,
          method.startColumn
        );
        // 鼠标移动到到range startPosition位置
        javaEditor.selection = new vscode.Selection(
          startPosition,
          startPosition
        );
      } catch (error) {
        console.error(`Error opening XML file:`, error);
      }
    }
  );
  context.subscriptions.push(disposable);
}
