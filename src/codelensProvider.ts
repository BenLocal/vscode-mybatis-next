import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { MyBatisUtils } from "./mybatisUtils";

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
    const javaFilePath = MyBatisUtils.getFilePath(uri);
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
        title: `🚀  Xml Mapper(${method.name})`,
        tooltip: `method: ${method.name}\nline: ${method.startLine}\nargs: ${
          method.parameters.join(", ") || "empty"
        }`,
        command: "mybatis-next.java2Xml",
        arguments: [
          javaFilePath,
          MyBatisUtils.getMapperNamespace(classInfo),
          method.name,
        ],
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
    const xmlFilePath = MyBatisUtils.getFilePath(uri);
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
        title: `🚀 Java Mapper(${sqlStatement.id})`,
        tooltip: `SQL: ${sqlStatement.id}`,
        command: "mybatis-next.xml2Java",
        arguments: [xmlFilePath, mapperInfo.namespace, sqlStatement.id],
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
