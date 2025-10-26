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
        // 在xml文件中查找方法名对应的sql语句
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
      } catch (error) {
        console.error(`Error opening XML file:`, error);
      }
    }
  );
  context.subscriptions.push(disposable);
}
