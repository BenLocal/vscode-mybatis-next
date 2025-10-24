import * as vscode from "vscode";
import * as treeSitter from "web-tree-sitter";

export class TreeSitterManager {
  private javaParser: treeSitter.Parser | null = null;
  private xmlParser: treeSitter.Parser | null = null;
  private javaLanguage: treeSitter.Language | null = null;
  private xmlLanguage: treeSitter.Language | null = null;

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    try {
      const wasmPath = vscode.Uri.joinPath(
        context.extensionUri,
        "dist",
        "tree-sitter.wasm"
      );
      await treeSitter.Parser.init(wasmPath);
      this.javaParser = new treeSitter.Parser();
      this.xmlParser = new treeSitter.Parser();

      // Load Java language
      const javaWasm = vscode.Uri.joinPath(
        context.extensionUri,
        "node_modules",
        "tree-sitter-java",
        "tree-sitter-java.wasm"
      );
      this.javaLanguage = await treeSitter.Language.load(javaWasm.fsPath);
      this.javaParser.setLanguage(this.javaLanguage);

      // Load XML language
      const xmlWasm = vscode.Uri.joinPath(
        context.extensionUri,
        "node_modules",
        "tree-sitter-xml",
        "tree-sitter-xml.wasm"
      );
      this.xmlLanguage = await treeSitter.Language.load(xmlWasm.fsPath);
      this.xmlParser.setLanguage(this.xmlLanguage);

      console.log("Tree-sitter initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Tree-sitter:", error);
    }
  }

  parseJava(content: string): treeSitter.Tree | null {
    if (!this.javaParser) {
      console.error("Java language not initialized");
      return null;
    }
    return this.javaParser.parse(content);
  }

  parseXml(content: string): treeSitter.Tree | null {
    if (!this.xmlParser) {
      console.error("XML language not initialized");
      return null;
    }

    return this.xmlParser.parse(content);
  }

  isInitialized(): boolean {
    return this.xmlParser !== null && this.javaParser !== null;
  }
}
