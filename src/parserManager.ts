import * as vscode from "vscode";
import * as treeSitter from "web-tree-sitter";
import { OutputLogger } from "./outputLogs";
import { LRUCache } from "lru-cache";

export class ParserManager {
  private javaParser: treeSitter.Parser | null = null;
  private javaLanguage: treeSitter.Language | null = null;
  private xmlTreeParser: treeSitter.Parser | null = null;
  private xmlTreeLanguage: treeSitter.Language | null = null;
  private treeCache: LRUCache<string, treeSitter.Tree> = new LRUCache({
    max: 100,
    ttl: 1000 * 60 * 10,
    updateAgeOnGet: true,
  });

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    await treeSitter.Parser.init({
      locateFile: (path: string, prefix: string) => {
        return vscode.Uri.joinPath(context.extensionUri, "wasm", path).fsPath;
      },
    });
    await this.initializeJavaParser(context);
    await this.initializeXmlParser(context);
  }

  async initializeJavaParser(context: vscode.ExtensionContext): Promise<void> {
    try {
      this.javaParser = new treeSitter.Parser();

      // Load Java language
      const javaWasm = vscode.Uri.joinPath(
        context.extensionUri,
        "wasm",
        "tree-sitter-java.wasm"
      );
      this.javaLanguage = await treeSitter.Language.load(javaWasm.fsPath);
      this.javaParser.setLanguage(this.javaLanguage);
      OutputLogger.info(
        "Tree-sitter Java parser initialized successfully",
        "PARSER_MANAGER"
      );
    } catch (error) {
      OutputLogger.errorWithStackTrace(
        "Failed to initialize Tree-sitter Java parser:",
        error as Error
      );
    }
  }

  async initializeXmlParser(context: vscode.ExtensionContext): Promise<void> {
    try {
      this.xmlTreeParser = new treeSitter.Parser();
      const xmlTreeWasm = vscode.Uri.joinPath(
        context.extensionUri,
        "wasm",
        "tree-sitter-xml.wasm"
      );
      this.xmlTreeLanguage = await treeSitter.Language.load(
        xmlTreeWasm.fsPath
      );
      this.xmlTreeParser.setLanguage(this.xmlTreeLanguage);
      OutputLogger.info(
        "Tree-sitter XML parser initialized successfully",
        "PARSER_MANAGER"
      );
    } catch (error) {
      OutputLogger.errorWithStackTrace(
        "Failed to initialize XML parser:",
        error as Error
      );
    }
  }

  parseJava(filePath: string, content: string): treeSitter.Tree | null {
    if (!this.javaParser) {
      console.error("Java language not initialized");
      return null;
    }

    const cacheTree = this.treeCache.get(filePath);
    if (cacheTree) {
      if (cacheTree.rootNode.text === content) {
        return cacheTree;
      }
    }

    const newTree = this.javaParser.parse(content);
    if (newTree) {
      this.treeCache.set(filePath, newTree);
    }
    return newTree;
  }

  parseXml(filePath: string, content: string): treeSitter.Tree | null {
    if (!this.xmlTreeParser) {
      console.error("XML language not initialized");
      return null;
    }

    const cacheTree = this.treeCache.get(filePath);
    if (cacheTree) {
      if (cacheTree.rootNode.text === content) {
        return cacheTree;
      }
    }

    const newTree = this.xmlTreeParser.parse(content);
    if (newTree) {
      this.treeCache.set(filePath, newTree);
    }
    return newTree;
  }
}
