import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { JavaClassInfo } from "./javaAnalyzer";

export class JavaMapperCodelensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();

  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  async provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const uri = document.uri;
    const info = await MappersStore.getInstance().addJavaFile(uri, document);
    if (!info) {
      return [];
    }
    const classInfo = info.info;
    if (!classInfo.methods || classInfo.methods.length <= 0) {
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
        command: "mybatis-next.java2Xml",
        arguments: [method.name, this.getMapperNamespace(classInfo)],
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }

  private getMapperNamespace(classInfo: JavaClassInfo): string {
    if (!classInfo.packageName) {
      return classInfo.className;
    }
    return classInfo.packageName + "." + classInfo.className;
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

export class XmlMapperCodelensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();

  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  async provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const uri = document.uri;
    const info = await MappersStore.getInstance().addXmlFile(uri, document);
    if (!info) {
      return [];
    }
    const mapperInfo = info.info;
    if (!mapperInfo.sqlStatements || mapperInfo.sqlStatements.length <= 0) {
      return [];
    }
    const codeLenses: vscode.CodeLens[] = [];
    for (const sqlStatement of mapperInfo.sqlStatements) {
      const startPosition = new vscode.Position(
        sqlStatement.startLine,
        sqlStatement.startColumn
      );
      const endPosition = new vscode.Position(
        sqlStatement.startLine,
        sqlStatement.startColumn
      );
      const range = new vscode.Range(startPosition, endPosition);

      const codeLens = new vscode.CodeLens(range, {
        title: `🔧 ${sqlStatement.id}`,
        tooltip: `SQL: ${sqlStatement.id}`,
        command: "mybatis-next.showSqlInfo",
        arguments: [sqlStatement],
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
