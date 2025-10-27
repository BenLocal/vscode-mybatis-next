import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { MyBatisUtils } from "./mybatisUtils";
import { VscodeUtils } from "./vscodeUtils";

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
        await VscodeUtils.ensurePositionVisible(javaEditor, startPosition);
      } catch (error) {
        console.error(`Error opening XML file:`, error);
      }
    }
  );
  context.subscriptions.push(disposable);
}
