import * as vscode from "vscode";
import { TreeSitterManager } from "./treeSitterManager";

let treeSitterManager: TreeSitterManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "mybatis-next" is now active!');

  // Initialize Tree-sitter
  treeSitterManager = new TreeSitterManager();
  await treeSitterManager.initialize(context);

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

  // Add command to test parsing
  const parseCommand = vscode.commands.registerCommand(
    "mybatis-next.testParse",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      const document = editor.document;
      const content = document.getText();
      
      if (document.languageId === 'java') {
        const tree = treeSitterManager.parseJava(content);
        vscode.window.showInformationMessage(`Java file parsed: ${tree?.rootNode.type}`);
      } else if (document.languageId === 'xml') {
        const tree = treeSitterManager.parseXml(content);
        vscode.window.showInformationMessage(`XML file parsed: ${tree?.rootNode.type}`);
      } else {
        vscode.window.showWarningMessage("Unsupported file type for parsing");
      }
    }
  );

  context.subscriptions.push(disposable, parseCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}

export function getTreeSitterManager(): TreeSitterManager {
  return treeSitterManager;
}
