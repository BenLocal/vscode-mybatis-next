import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { MyBatisUtils } from "./mybatisUtils";
import { OutputLogger } from "./outputLogs";

export class JavaMapperCodelensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();

  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    if (token.isCancellationRequested) {
      OutputLogger.info("Code lens provider cancelled", "CODE_LENS_PROVIDER");
      return [];
    }

    const startTime = performance.now();
    const uri = document.uri;
    const javaFilePath = MyBatisUtils.getFilePath(uri);
    const info = await MappersStore.getInstance().addJavaFile(uri, document);
    if (!info) {
      return [];
    }
    const classInfo = info.info;
    const namespace = MyBatisUtils.getMapperNamespace(classInfo);
    const classPosition = classInfo.classPosition;
    const position = new vscode.Position(
      classPosition.startLine,
      classPosition.startColumn
    );
    const codeLens = new vscode.CodeLens(
      new vscode.Range(position, position),
      {
        title: `🚀  Xml Mapper`,
        command: "mybatis-next.java2Xml",
        arguments: [javaFilePath, namespace, null],
      }
    );

    const codeLenses: vscode.CodeLens[] = [];
    codeLenses.push(codeLens);

    if (!classInfo.methods || classInfo.methods.length <= 0) {
      return codeLenses;
    }

    for (const method of classInfo.methods) {
      const position = new vscode.Position(
        method.startLine,
        method.startColumn
      );
      const codeLens = new vscode.CodeLens(new vscode.Range(position, position), {
        title: `🚀  Xml Mapper(${method.name})`,
        tooltip: `method: ${method.name}
line: ${method.startLine}
return: ${method.returnType || "void"}
args: ${method.parameters.join(", ") || "empty"}`,
        command: "mybatis-next.java2Xml",
        arguments: [javaFilePath, namespace, method.name],
      });

      codeLenses.push(codeLens);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    OutputLogger.info(
      `Java mapper ${javaFilePath} codelens provider took ${duration}ms, size: ${codeLenses.length}`,
      "CODE_LENS_PROVIDER"
    );
    return codeLenses;
  }

  resolveCodeLens?(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    if (token.isCancellationRequested) {
      OutputLogger.info("Code lens provider cancelled", "CODE_LENS_PROVIDER");
      return undefined;
    }
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
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    if (token.isCancellationRequested) {
      OutputLogger.info("Code lens provider cancelled", "CODE_LENS_PROVIDER");
      return [];
    }

    const startTime = performance.now();
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
      const position = new vscode.Position(
        sqlStatement.startLine,
        sqlStatement.startColumn
      );
      const codeLens = new vscode.CodeLens(new vscode.Range(position, position), {
        title: `🚀 Java Mapper(${sqlStatement.id})`,
        tooltip: `SQL: ${sqlStatement.id}`,
        command: "mybatis-next.xml2Java",
        arguments: [xmlFilePath, mapperInfo.namespace, sqlStatement.id],
      });

      codeLenses.push(codeLens);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    OutputLogger.info(
      `Xml mapper ${xmlFilePath} codelens provider took ${duration}ms, size: ${codeLenses.length}`,
      "CODE_LENS_PROVIDER"
    );
    return codeLenses;
  }

  resolveCodeLens?(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    if (token.isCancellationRequested) {
      OutputLogger.info("Code lens provider cancelled", "CODE_LENS_PROVIDER");
      return undefined;
    }
    return codeLens;
  }

  public fire() {
    this._onDidChangeCodeLenses.fire();
  }
}
