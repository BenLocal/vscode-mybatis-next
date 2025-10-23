import * as vscode from "vscode";
import * as Parser from "web-tree-sitter";

export class TreeSitterManager {
  private parser: Parser.Parser | null = null;
  private javaLanguage: Parser.Language | null = null;
  private xmlLanguage: Parser.Language | null = null;

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    try {
      await Parser.init();
      this.parser = new Parser.Parser();

      // Load Java language
      const javaWasm = vscode.Uri.joinPath(
        context.extensionUri,
        "node_modules",
        "tree-sitter-java",
        "tree-sitter-java.wasm"
      );
      this.javaLanguage = await Parser.Language.load(javaWasm.fsPath);

      // Load XML language
      const xmlWasm = vscode.Uri.joinPath(
        context.extensionUri,
        "node_modules",
        "tree-sitter-xml",
        "tree-sitter-xml.wasm"
      );
      this.xmlLanguage = await Parser.Language.load(xmlWasm.fsPath);

      console.log("Tree-sitter initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Tree-sitter:", error);
    }
  }

  parseJava(content: string): Parser.Tree | null {
    if (!this.parser || !this.javaLanguage) {
      console.error("Java language not initialized");
      return null;
    }

    this.parser.setLanguage(this.javaLanguage);
    return this.parser.parse(content);
  }

  parseXml(content: string): Parser.Tree | null {
    if (!this.parser || !this.xmlLanguage) {
      console.error("XML language not initialized");
      return null;
    }

    this.parser.setLanguage(this.xmlLanguage);
    return this.parser.parse(content);
  }

  isInitialized(): boolean {
    return (
      this.parser !== null &&
      this.javaLanguage !== null &&
      this.xmlLanguage !== null
    );
  }
}
