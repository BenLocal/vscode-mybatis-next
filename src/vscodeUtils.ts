import * as vscode from "vscode";

export class VscodeUtils {
  private constructor() { }

  public static async ensurePositionVisible(editor: vscode.TextEditor, position: vscode.Position) {
    // 设置光标位置
    editor.selection = new vscode.Selection(position, position);

    // 使用 VSCode 内置命令确保位置可见
    await vscode.commands.executeCommand('revealLine', {
      lineNumber: position.line + 1, // VSCode 使用 1-based 行号
      at: 'center'
    });

    // 等待命令执行完成
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
