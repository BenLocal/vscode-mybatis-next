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
        let startPosition = null;
        if (id) {
          const method = javaFile.info.methods.find(
            (method) => method.name === id
          );
          if (!method) {
            vscode.window.setStatusBarMessage(
              `Warning: Method "${id}" not found, will jump to class definition position`,
              3000
            );
            startPosition = new vscode.Position(
              javaFile.info.classPosition.startLine,
              javaFile.info.classPosition.startColumn
            );
          } else {
            startPosition = new vscode.Position(
              method.startLine,
              method.startColumn
            );
          }
        } else {
          // class codelens
          startPosition = new vscode.Position(
            javaFile.info.classPosition.startLine,
            javaFile.info.classPosition.startColumn
          );
        }

        if (!startPosition) {
          return;
        }

        const fileUri = MyBatisUtils.getFilePath(javaFile.file);
        const javaDocument = await vscode.workspace.openTextDocument(fileUri);
        const javaEditor = await vscode.window.showTextDocument(javaDocument);
        await VscodeUtils.ensurePositionVisible(javaEditor, startPosition);
      } catch (error) {
        console.error(`Error opening XML file:`, error);
      }
    }
  );
  context.subscriptions.push(disposable);
}
