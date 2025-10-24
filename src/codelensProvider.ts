import * as vscode from "vscode";
import { TreeSitterManager } from "./treeSitterManager";
import { JavaAnalyzer } from "./javaAnalyzer";

export class JavaMapperCodelensProvider implements vscode.CodeLensProvider {
  private readonly _treeSitter: TreeSitterManager;

  private readonly _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();

  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor(treeSitter: TreeSitterManager) {
    this._treeSitter = treeSitter;
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const text = document.getText();
    const tree = this._treeSitter.parseJava(text);
    if (!tree) {
      return [];
    }

    const classInfo = JavaAnalyzer.analyzeTree(tree);
    if (!classInfo?.methods || classInfo.methods.length <= 0) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];

    for (const method of classInfo.methods) {
      const startPosition = new vscode.Position(
        method.startLine,
        method.startColumn
      );
      const endPosition = new vscode.Position(
        method.startLine,
        method.startColumn
      );
      const range = new vscode.Range(startPosition, endPosition);

      const codeLens = new vscode.CodeLens(range, {
        title: `🔧 ${method.name}(${method.parameters.join(", ")})${
          method.returnType ? ": " + method.returnType : ""
        }`,
        tooltip: `方法: ${method.name}\n行号: ${method.startLine}\n参数: ${
          method.parameters.join(", ") || "无"
        }`,
        command: "mybatis-next.showMethodInfo",
        arguments: [method],
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }

  resolveCodeLens?(
    codeLens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }

  public fire() {
    this._onDidChangeCodeLenses.fire();
  }
}
