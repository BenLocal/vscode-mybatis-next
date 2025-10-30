import * as vscode from "vscode";
import * as treeSitter from "web-tree-sitter";

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

export interface TextPosition {
  text: string;
  startPosition: vscode.Position;
  endPosition: vscode.Position;
}

export declare namespace TextPosition {
  function createByNode(text: string, node: treeSitter.Node): TextPosition;
}

TextPosition.createByNode = function (text: string, node: treeSitter.Node): TextPosition {
  return {
    text: text,
    startPosition: new vscode.Position(node.startPosition.row, node.startPosition.column),
    endPosition: new vscode.Position(node.endPosition.row, node.endPosition.column),
  };
};


