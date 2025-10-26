import * as vscode from "vscode";
import { FastXmlParseResult, ParserManager } from "./parserManager";
import { MyBatisMapperInfo, XmlAnalyzer } from "./xmlAnalyzer";
import { JavaAnalyzer, JavaClassInfo } from "./javaAnalyzer";
import * as treeSitter from "web-tree-sitter";
import * as crypto from "crypto";
import { MyBatisUtils } from "./mybatisUtils";
import { BiMap } from "@rimbu/bimap";

export interface JavaMapperInfo {
  file: vscode.Uri | string;
  tree: treeSitter.Tree;
  info: JavaClassInfo;
  context_hash: string;
}

export interface XmlMapperInfo {
  file: vscode.Uri | string;
  fastResult: FastXmlParseResult;
  info: MyBatisMapperInfo;
  context_hash: string;
}

export class MappersStore {
  private static instance: MappersStore;

  private readonly _xmlFiles: Map<string, XmlMapperInfo> = new Map();
  private readonly _javaFiles: Map<string, JavaMapperInfo> = new Map();
  // key is java file path, value is best xml file path
  private readonly _bestMapper: BiMap<string, string> = BiMap.empty<
    string,
    string
  >();
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

  public async addXmlFile(
    file: vscode.Uri | string,
    doc: vscode.TextDocument
  ): Promise<XmlMapperInfo | null> {
    if (doc.languageId !== "xml") {
      return null;
    }
    const content = doc.getText();
    const contextHash = await this.calculateContextHash(content);
    // check if the file is already in the _xmlFiles
    const filePath = MyBatisUtils.getFilePath(file);
    if (this._xmlFiles.has(filePath)) {
      const xmlMapperInfo = this._xmlFiles.get(filePath)!;
      if (xmlMapperInfo.context_hash === contextHash) {
        return xmlMapperInfo;
      }
    }

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
      context_hash: contextHash,
    };

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

  public async addJavaFile(
    file: vscode.Uri,
    doc: vscode.TextDocument
  ): Promise<JavaMapperInfo | null> {
    if (doc.languageId !== "java") {
      return null;
    }

    const content = doc.getText();
    const filePath = MyBatisUtils.getFilePath(file);
    const contextHash = await this.calculateContextHash(content);

    if (this._javaFiles.has(filePath)) {
      const javaMapperInfo = this._javaFiles.get(filePath)!;
      if (javaMapperInfo.context_hash === contextHash) {
        return javaMapperInfo;
      }
    }
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
      context_hash: contextHash,
    };

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
    javaFilePath: string,
    namespace: string
  ): XmlMapperInfo | null {
    if (this._bestMapper.hasKey(javaFilePath)) {
      const xmlfile = this._bestMapper.getKey(javaFilePath);
      if (xmlfile && this._xmlFiles.has(xmlfile)) {
        return this._xmlFiles.get(xmlfile)!;
      }
    }

    let files: XmlMapperInfo[] = Array.from(this._xmlFiles.values()).filter(
      (xmlFile: XmlMapperInfo) => xmlFile.info.namespace === namespace
    );
    if (files.length <= 0) {
      return null;
    }
    const bestXmlFile = files[0];
    this._bestMapper.set(
      javaFilePath,
      MyBatisUtils.getFilePath(bestXmlFile.file)
    );
    return bestXmlFile;
  }

  public selectBestJavaFile(
    xmlFilePath: string,
    namespace: string
  ): JavaMapperInfo | null {
    if (this._bestMapper.hasValue(xmlFilePath)) {
      const javaFilePath = this._bestMapper.getValue(xmlFilePath);
      if (javaFilePath && this._javaFiles.has(javaFilePath)) {
        return this._javaFiles.get(javaFilePath)!;
      }
    }
    let files: JavaMapperInfo[] = Array.from(this._javaFiles.values()).filter(
      (javaFile: JavaMapperInfo) =>
        MyBatisUtils.getMapperNamespace(javaFile.info) === namespace
    );
    if (files.length <= 0) {
      return null;
    }

    const bestJavaFile = files[0];
    this._bestMapper.set(
      MyBatisUtils.getFilePath(bestJavaFile.file),
      xmlFilePath
    );
    return bestJavaFile;
  }

  private async calculateContextHash(content: string): Promise<string> {
    const hashBuffer = await crypto.webcrypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(content)
    );
    const hash = Buffer.from(hashBuffer).toString("hex");
    return hash;
  }
}
