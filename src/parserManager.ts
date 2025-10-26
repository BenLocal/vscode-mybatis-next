import * as vscode from "vscode";
import * as treeSitter from "web-tree-sitter";
import * as fastXmlParser from "fast-xml-parser";

export interface FastXmlParseResult {
  xmlMetaDataSymbol: Symbol | null;
  data: FastXmlParseDataResult;
}

export interface FastXmlParseDataResult {
  [key: string]: any;
}

export class ParserManager {
  private javaParser: treeSitter.Parser | null = null;
  private javaLanguage: treeSitter.Language | null = null;
  private xmlParser: fastXmlParser.XMLParser | null = null;
  private xmlMetaDataSymbol: Symbol | null = null;

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    await this.initializeJavaParser(context);
    await this.initializeXmlParser(context);
  }

  async initializeJavaParser(context: vscode.ExtensionContext): Promise<void> {
    try {
      await treeSitter.Parser.init({
        locateFile: (path: string, prefix: string) => {
          return vscode.Uri.joinPath(context.extensionUri, "wasm", path).fsPath;
        },
      });
      this.javaParser = new treeSitter.Parser();

      // Load Java language
      const javaWasm = vscode.Uri.joinPath(
        context.extensionUri,
        "wasm",
        "tree-sitter-java.wasm"
      );
      this.javaLanguage = await treeSitter.Language.load(javaWasm.fsPath);
      this.javaParser.setLanguage(this.javaLanguage);
      console.log("Tree-sitter initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Tree-sitter:", error);
    }
  }

  async initializeXmlParser(context: vscode.ExtensionContext): Promise<void> {
    try {
      const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        captureMetaData: true,
      };
      this.xmlParser = new fastXmlParser.XMLParser(options);
      this.xmlMetaDataSymbol = fastXmlParser.XMLParser.getMetaDataSymbol();
    } catch (error) {
      console.error("Failed to initialize XML parser:", error);
    }
  }

  parseJava(content: string): treeSitter.Tree | null {
    if (!this.javaParser) {
      console.error("Java language not initialized");
      return null;
    }
    return this.javaParser.parse(content);
  }

  parseXml(content: string): FastXmlParseResult | null {
    if (!this.xmlParser) {
      console.error("XML language not initialized");
      return null;
    }

    try {
      const result = this.xmlParser.parse(content) as FastXmlParseDataResult;
      return {
        xmlMetaDataSymbol: this.xmlMetaDataSymbol,
        data: result,
      };
    } catch (error) {
      console.error("Failed to parse XML:", error);
      return null;
    }
  }

  isInitialized(): boolean {
    return this.xmlParser !== null && this.javaParser !== null;
  }
}
