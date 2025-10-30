import * as vscode from "vscode";
import * as treeSitter from "web-tree-sitter";
import * as crypto from "crypto";
import path from "path";
import { JavaClassInfo } from "./javaAnalyzer";

export class VscodeUtils {
  private constructor() {}

  public static async ensurePositionVisible(
    editor: vscode.TextEditor,
    position: vscode.Position
  ) {
    // 设置光标位置
    editor.selection = new vscode.Selection(position, position);

    // 使用 VSCode 内置命令确保位置可见
    await vscode.commands.executeCommand("revealLine", {
      lineNumber: position.line + 1, // VSCode 使用 1-based 行号
      at: "center",
    });

    // 等待命令执行完成
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  public static getMapperNamespace(classInfo: JavaClassInfo): string {
    if (!classInfo.packageName) {
      return classInfo.className;
    }
    return classInfo.packageName + "." + classInfo.className;
  }

  public static getFilePath(file: vscode.Uri | string): string {
    return typeof file === "string" ? file : file.fsPath;
  }

  public static async calculateContextHash(content: string): Promise<string> {
    const hashBuffer = await crypto.webcrypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(content)
    );
    const hash = Buffer.from(hashBuffer).toString("hex");
    return hash;
  }

  public static treeSitterTypeIs(
    node: treeSitter.Node | null,
    type: string
  ): boolean {
    if (!node) {
      return false;
    }
    return node.type.toLocaleLowerCase() === type.toLocaleLowerCase();
  }

  public static filePathDistance(path1: string, path2: string): number {
    try {
      const path1Dir = path.dirname(path.resolve(path1)).toLowerCase();
      const path2Dir = path.dirname(path.resolve(path2)).toLowerCase();
      if (path1Dir === path2Dir) {
        return 0;
      }
      const parts1 = path1Dir.split(path.sep);
      const parts2 = path2Dir.split(path.sep);
      let idx = 0;
      while (
        idx < parts1.length &&
        idx < parts2.length &&
        parts1[idx] === parts2[idx]
      ) {
        idx++;
      }
      const up = parts1.length - idx;
      const down = parts2.length - idx;
      return up + down;
    } catch {
      return -1;
    }
  }
}

export interface TextPosition {
  text: string;
  startPosition: vscode.Position;
  endPosition: vscode.Position;
}

export namespace TextPosition {
  export function createByNode(
    text: string,
    node: treeSitter.Node
  ): TextPosition {
    return {
      text,
      startPosition: new vscode.Position(
        node.startPosition.row,
        node.startPosition.column
      ),
      endPosition: new vscode.Position(
        node.endPosition.row,
        node.endPosition.column
      ),
    };
  }
}
