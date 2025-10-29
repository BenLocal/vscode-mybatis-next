import * as vscode from "vscode";
import { ParserManager } from "./parserManager";
import { MyBatisMapperInfo, XmlAnalyzer } from "./xmlAnalyzer";
import { JavaAnalyzer, JavaClassInfo } from "./javaAnalyzer";
import * as treeSitter from "web-tree-sitter";
import { MyBatisUtils } from "./mybatisUtils";
import { BiMap } from "@rimbu/bimap";
import { OutputLogger } from "./outputLogs";
import { TwoWayMap } from "./twoWayMap";

export interface JavaMapperInfo {
  file: vscode.Uri | string;
  info: JavaClassInfo;
  context_hash: string;
}

export interface XmlMapperInfo {
  file: vscode.Uri | string;
  info: MyBatisMapperInfo;
  context_hash: string;
}

const MAYBE_MYBATIS_JAVA_FILE_IMPORTS: Set<string> = new Set([
  "org.apache.ibatis.annotations.Param",
]);

export class MappersStore {
  private static instance: MappersStore;

  private readonly _xmlFiles: Map<string, XmlMapperInfo> = new Map();
  private readonly _javaFiles: Map<string, JavaMapperInfo> = new Map();
  // key is java file path, value is best xml file path
  private readonly _bestMapper: TwoWayMap<string, string> = new TwoWayMap<
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
    const contextHash = await MyBatisUtils.calculateContextHash(content);
    // check if the file is already in the _xmlFiles
    const filePath = MyBatisUtils.getFilePath(file);
    const xmlMapperInfo = this._xmlFiles.get(filePath);
    if (xmlMapperInfo && xmlMapperInfo.context_hash === contextHash) {
      return xmlMapperInfo;
    }

    try {
      const result = this._parserManager!.parseXml(filePath, content);
      if (!this.isMybatisMapperXmlFile(result)) {
        OutputLogger.warn(
          `File ${filePath} is not a Mybatis XML mapper file`,
          "MAPPERS_STORE"
        );
        return null;
      }
      const info = XmlAnalyzer.analyzeTree(result!);
      if (!info) {
        return null;
      }
      const xmlMapperInfo: XmlMapperInfo = {
        file,
        info: info,
        context_hash: contextHash,
      };

      this._xmlFiles.set(filePath, xmlMapperInfo);
      return xmlMapperInfo;
    } catch (error) {
      OutputLogger.errorWithStackTrace(
        `Error analyzing XML file ${filePath}:`,
        error as Error
      );
      return null;
    }
  }

  public async removeXmlFile(file: vscode.Uri | string): Promise<void> {
    const filePath = MyBatisUtils.getFilePath(file);
    this._xmlFiles.delete(filePath);
    this._bestMapper.removeValue(filePath);
  }

  public async removeJavaFile(file: vscode.Uri | string): Promise<void> {
    const filePath = MyBatisUtils.getFilePath(file);
    this._javaFiles.delete(filePath);
    this._bestMapper.removeKey(filePath);
  }

  private isMybatisMapperXmlFile(tree: treeSitter.Tree | null): boolean {
    if (!tree) {
      return false;
    }
    return this.hasMybatisDoctypeDeclaration(tree.rootNode);
  }

  private hasMybatisDoctypeDeclaration(rootNode: treeSitter.Node): boolean {
    for (let i = 0; i < rootNode.childCount; i++) {
      const child = rootNode.child(i);
      if (MyBatisUtils.treeSitterTypeIs(child, "prolog")) {
        for (let j = 0; j < child!.childCount; j++) {
          const doctypeChild = child!.child(j);
          if (MyBatisUtils.treeSitterTypeIs(doctypeChild, "doctypedecl")) {
            const doctypeText = doctypeChild!.text;
            if (
              doctypeText.includes("mybatis.org") &&
              doctypeText.includes("mapper")
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
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
    const contextHash = await MyBatisUtils.calculateContextHash(content);
    const javaMapperInfo = this._javaFiles.get(filePath);
    if (javaMapperInfo && javaMapperInfo.context_hash === contextHash) {
      return javaMapperInfo;
    }

    try {
      const result = this._parserManager!.parseJava(filePath, content);
      if (!result) {
        return null;
      }
      const info = JavaAnalyzer.analyzeTree(result);
      if (!this.isMybatisJavaFile(info)) {
        OutputLogger.warn(
          `File ${filePath} is not a Mybatis Java file`,
          "MAPPERS_STORE"
        );
        return null;
      }
      const javaMapperInfo: JavaMapperInfo = {
        file,
        info: info!,
        context_hash: contextHash,
      };

      this._javaFiles.set(filePath, javaMapperInfo);
      return javaMapperInfo;
    } catch (error) {
      OutputLogger.errorWithStackTrace(
        `Error parsing Java file ${filePath}:`,
        error as Error
      );
      return null;
    }
  }

  private isMybatisJavaFile(info: JavaClassInfo | null): boolean {
    if (!info) {
      return false;
    }
    if (info.classType !== "interface") {
      return false;
    }

    let importMybatis = false;
    if (
      info.classAnnotations.includes("org.apache.ibatis.annotations.Mapper")
    ) {
      importMybatis = true;
    } else if (
      info.classAnnotations.includes("Mapper") &&
      info.imports.includes("org.apache.ibatis.annotations.Mapper")
    ) {
      importMybatis = true;
    } else if (
      info.imports.some((importName) =>
        MAYBE_MYBATIS_JAVA_FILE_IMPORTS.has(importName)
      )
    ) {
      importMybatis = true;
    }

    if (!importMybatis) {
      // get xml namespace
      const namespace = MyBatisUtils.getMapperNamespace(info);
      const hasMatchingNamespace = Array.from(this._xmlFiles.values()).some(
        (xmlFile: XmlMapperInfo) => xmlFile.info.namespace === namespace
      );
      if (!hasMatchingNamespace) {
        return false;
      }
    }

    return true;
  }

  public selectBestXmlFile(
    javaFilePath: string,
    namespace: string
  ): XmlMapperInfo | null {
    if (this._bestMapper.hasValue(javaFilePath)) {
      const xmlfile = this._bestMapper.getValue(javaFilePath);
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

    const sortedFiles = files
      .map((file): { file: XmlMapperInfo; distance: number } => {
        const filePath = MyBatisUtils.getFilePath(file.file);
        return {
          file: file,
          distance: MyBatisUtils.filePathDistance(filePath, javaFilePath),
        };
      })
      .filter((file) => file.distance >= 0)
      .sort((a, b) => a.distance - b.distance); // ascending order
    const bestXmlFile = sortedFiles.length > 0 ? sortedFiles[0].file : files[0];
    this._bestMapper.onlyAddKey(
      javaFilePath,
      MyBatisUtils.getFilePath(bestXmlFile.file)
    );
    return bestXmlFile;
  }

  public selectBestJavaFile(
    xmlFilePath: string,
    namespace: string
  ): JavaMapperInfo | null {
    if (this._bestMapper.hasKey(xmlFilePath)) {
      const javaFilePath = this._bestMapper.getKey(xmlFilePath);
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

    const sortedFiles = files
      .map((file): { file: JavaMapperInfo; distance: number } => {
        const filePath = MyBatisUtils.getFilePath(file.file);
        return {
          file: file,
          distance: MyBatisUtils.filePathDistance(filePath, xmlFilePath),
        };
      })
      .filter((file) => file.distance >= 0)
      .sort((a, b) => a.distance - b.distance); // ascending order

    const bestJavaFile =
      sortedFiles.length > 0 ? sortedFiles[0].file : files[0];
    this._bestMapper.onlyAddValue(
      xmlFilePath,
      MyBatisUtils.getFilePath(bestJavaFile.file)
    );
    return bestJavaFile;
  }

  public getMappersCount(): { xmlCount: number; javaCount: number } {
    return {
      xmlCount: this._xmlFiles.size,
      javaCount: this._javaFiles.size,
    };
  }

  public cleanup(): void {
    this._xmlFiles.clear();
    this._javaFiles.clear();
    this._bestMapper.clear();
  }
}
