import * as vscode from "vscode";
import { FastXmlParseResult, ParserManager } from "./parserManager";
import { MyBatisMapperInfo, XmlAnalyzer } from "./xmlAnalyzer";
import { JavaAnalyzer, JavaClassInfo } from "./javaAnalyzer";
import * as treeSitter from "web-tree-sitter";

export interface JavaMapperInfo {
  file: vscode.Uri | string;
  tree: treeSitter.Tree;
  info: JavaClassInfo;
}

export interface XmlMapperInfo {
  file: vscode.Uri | string;
  fastResult: FastXmlParseResult;
  info: MyBatisMapperInfo;
}

export class MappersStore {
  private static instance: MappersStore;

  private readonly _xmlFiles: Map<string, XmlMapperInfo> = new Map();
  private readonly _javaFiles: Map<string, JavaMapperInfo> = new Map();
  private _parserManager: ParserManager | null = null;

  private constructor() {
    this._xmlFiles = new Map();
    this._javaFiles = new Map();
  }

  async initialize(
    context: vscode.ExtensionContext,
    _parserManager: ParserManager
  ): Promise<void> {
    this._parserManager = _parserManager;
  }

  public static getInstance(): MappersStore {
    if (!MappersStore.instance) {
      MappersStore.instance = new MappersStore();
    }
    return MappersStore.instance;
  }

  public addXmlFile(
    file: vscode.Uri | string,
    doc: vscode.TextDocument
  ): XmlMapperInfo | null {
    if (doc.languageId !== "xml") {
      return null;
    }
    const content = doc.getText();
    const result = this._parserManager!.parseXml(content);
    if (!this.isMybatisMapperXmlFile(result)) {
      return null;
    }
    const info = XmlAnalyzer.analyzeMapperXml(result!, content);
    if (!info) {
      return null;
    }
    const xmlMapperInfo: XmlMapperInfo = {
      file,
      fastResult: result!,
      info: info,
    };
    const filePath = typeof file === "string" ? file : file.fsPath;
    this._xmlFiles.set(filePath, xmlMapperInfo);
    return xmlMapperInfo;
  }

  private isMybatisMapperXmlFile(result: FastXmlParseResult | null): boolean {
    if (!result) {
      return false;
    }
    if (!result.data.mapper) {
      return false;
    }
    if (!result.data.mapper["@_namespace"]) {
      return false;
    }
    return true;
  }

  public addJavaFile(
    file: vscode.Uri,
    doc: vscode.TextDocument
  ): JavaMapperInfo | null {
    if (doc.languageId !== "java") {
      return null;
    }
    const content = doc.getText();
    const result = this._parserManager!.parseJava(content);
    if (!result) {
      return null;
    }
    const info = JavaAnalyzer.analyzeTree(result);
    if (!this.isMybatisJavaFile(info)) {
      return null;
    }
    const javaMapperInfo: JavaMapperInfo = {
      file,
      tree: result,
      info: info!,
    };

    const filePath = typeof file === "string" ? file : file.fsPath;
    this._javaFiles.set(filePath, javaMapperInfo);
    return javaMapperInfo;
  }

  private isMybatisJavaFile(info: JavaClassInfo | null): boolean {
    if (!info) {
      return false;
    }
    if (info.classType !== "interface") {
      return false;
    }

    let importMybatis = false;
    for (const importName of info.imports) {
      if (importName.startsWith("org.apache.ibatis.")) {
        importMybatis = true;
        break;
      }
    }
    if (!importMybatis) {
      return false;
    }

    return true;
  }

  public selectBestXmlFile(
    methodName: string,
    namespace: string
  ): XmlMapperInfo | null {
    let files: XmlMapperInfo[] = Array.from(this._xmlFiles.values()).filter(
      (xmlFile: XmlMapperInfo) => xmlFile.info.namespace === namespace
    );
    if (files.length <= 0) {
      return null;
    }
    return files[0];
  }
}
