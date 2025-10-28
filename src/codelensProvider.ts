import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { MyBatisUtils } from "./mybatisUtils";
import { OutputLogger } from "./outputLogs";
import { JavaMethodInfo } from "./javaAnalyzer";

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
    const codeLens = new vscode.CodeLens(new vscode.Range(position, position), {
      title: `🚀  Xml Mapper`,
      command: "mybatis-next.java2Xml",
      arguments: [javaFilePath, namespace, null],
    });

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
      const returnType = this.getReturnType(classInfo.imports, method);
      const codeLens = new vscode.CodeLens(
        new vscode.Range(position, position),
        {
          title: `🚀  Xml Mapper(${method.name})`,
          tooltip: `method: ${method.name}
line: ${method.startLine}
return: ${method.returnType || "void"}
args: ${method.parameterStr || "empty"}`,
          command: "mybatis-next.java2Xml",
          arguments: [javaFilePath, namespace, method.name, returnType],
        }
      );

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

  private getReturnType(
    imports: string[],
    method: JavaMethodInfo
  ): string | undefined {
    if (!method.returnType) {
      return;
    }
    let returnType = method.returnType.trim();
    if (returnType === "void") {
      return;
    }

    if (/<[^>]+>/.test(returnType)) {
      const genericMatch = returnType.match(/^([^<]+)<(.+)>$/);
      if (genericMatch) {
        const genericPart = genericMatch[2];
        const typeParameters = this.parseGenericParameters(genericPart);
        if (typeParameters.length > 0) {
          returnType = typeParameters[0];
        }
      }
    }
    switch (returnType) {
      case "int":
        return "int";
      case "long":
        return "long";
      case "float":
        return "float";
      case "double":
        return "double";
      case "boolean":
        return "boolean";
      case "String":
        return "java.lang.String";
      case "Object":
        return "java.lang.Object";
      case "Integer":
        return "java.lang.Integer";
      case "Long":
        return "java.lang.Long";
      case "Float":
        return "java.lang.Float";
      case "Double":
        return "java.lang.Double";
      case "Boolean":
        return "java.lang.Boolean";
      default: {
        const importType = imports.find(
          (imp) => imp.endsWith("." + returnType) || imp === returnType
        );
        if (importType) {
          return importType;
        }
        return returnType;
      }
    }
  }

  private parseGenericParameters(genericPart: string): string[] {
    const parameters: string[] = [];
    let current = "";
    let depth = 0;

    for (const element of genericPart) {
      const char = element;

      if (char === "<") {
        depth++;
        current += char;
      } else if (char === ">") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        // 顶级逗号，分割参数
        parameters.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // 添加最后一个参数
    if (current.trim()) {
      parameters.push(current.trim());
    }

    return parameters;
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
    const position = new vscode.Position(0, 0);
    const codeLens = new vscode.CodeLens(new vscode.Range(position, position), {
      title: `🚀 Java Mapper`,
      command: "mybatis-next.xml2Java",
      arguments: [xmlFilePath, mapperInfo.namespace, null],
    });

    const codeLenses: vscode.CodeLens[] = [];
    codeLenses.push(codeLens);
    if (!mapperInfo.sqlStatements || mapperInfo.sqlStatements.length <= 0) {
      return codeLenses;
    }
    for (const sqlStatement of mapperInfo.sqlStatements) {
      const position = new vscode.Position(
        sqlStatement.startLine,
        sqlStatement.startColumn
      );
      const codeLens = new vscode.CodeLens(
        new vscode.Range(position, position),
        {
          title: `🚀 Java Mapper(${sqlStatement.id})`,
          tooltip: `SQL: ${sqlStatement.id}`,
          command: "mybatis-next.xml2Java",
          arguments: [xmlFilePath, mapperInfo.namespace, sqlStatement.id],
        }
      );

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
