import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { MyBatisUtils } from "./mybatisUtils";

export function registerJava2XmlCommands(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "mybatis-next.java2Xml",
    async (javaFilePath: string, namespace: string, methodName: string) => {
      try {
        const xmlFile = MappersStore.getInstance().selectBestXmlFile(
          javaFilePath,
          namespace
        );
        if (!xmlFile) {
          return;
        }
        const fileUri = MyBatisUtils.getFilePath(xmlFile.file);
        const xmlDocument = await vscode.workspace.openTextDocument(fileUri);
        const xmlEditor = await vscode.window.showTextDocument(xmlDocument);
        const sqlStatement = xmlFile.info.sqlStatements.find(
          (sqlStatement) => sqlStatement.id === methodName
        );
        if (!sqlStatement) {
          return;
        }
        const startPosition = new vscode.Position(
          sqlStatement.startLine,
          sqlStatement.startColumn
        );
        // 鼠标移动到到range startPosition位置
        xmlEditor.selection = new vscode.Selection(
          startPosition,
          startPosition
        );
        // 将当前光标位置显示在编辑器中间
        xmlEditor.revealRange(
          new vscode.Range(startPosition, startPosition),
          vscode.TextEditorRevealType.InCenter
        );
      } catch (error) {
        console.error(`Error opening XML file:`, error);
      }
    }
  );
  context.subscriptions.push(disposable);
}
