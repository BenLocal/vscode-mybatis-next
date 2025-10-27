import * as vscode from "vscode";
import * as treeSitter from "web-tree-sitter";
import * as fastXmlParser from "fast-xml-parser";

export interface XmlParseResult {
  type: "fast-xml-parser" | "tree-sitter";
  xmlMetaDataSymbol: Symbol | null;
  data: FastXmlParseDataResult;
  tree: treeSitter.Tree | null;
}

export interface FastXmlParseDataResult {
  [key: string]: any;
}

export class ParserManager {
  private javaParser: treeSitter.Parser | null = null;
  private javaLanguage: treeSitter.Language | null = null;
  private xmlParser: fastXmlParser.XMLParser | null = null;
  private xmlMetaDataSymbol: Symbol | null = null;
  private xmlTreeParser: treeSitter.Parser | null = null;
  private xmlTreeLanguage: treeSitter.Language | null = null;

  private readonly _xmlParserType: string = "fast-xml-parser";

  constructor(xmlParserType: string = "fast-xml-parser") {
    if (
      xmlParserType !== "fast-xml-parser" &&
      xmlParserType !== "tree-sitter"
    ) {
      throw new Error("Invalid XML parser type");
    }
    this._xmlParserType = xmlParserType;
  }

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
      if (this._xmlParserType === "fast-xml-parser") {
        const options = {
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          textNodeName: "#text",
          captureMetaData: true,
        };
        this.xmlParser = new fastXmlParser.XMLParser(options);
        this.xmlMetaDataSymbol = fastXmlParser.XMLParser.getMetaDataSymbol();
      } else if (this._xmlParserType === "tree-sitter") {
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
        console.log("Tree-sitter XML parser initialized successfully");
      }
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

  parseXmlTreeSitter(content: string): XmlParseResult | null {
    if (!this.xmlTreeParser) {
      console.error("XML language not initialized");
      return null;
    }
    const tree = this.xmlTreeParser.parse(content);
    return {
      type: "tree-sitter",
      xmlMetaDataSymbol: null,
      data: {} as FastXmlParseDataResult,
      tree: tree,
    };
  }

  parseXmlFastXmlParser(content: string): XmlParseResult | null {
    if (!this.xmlParser) {
      console.error("XML language not initialized");
      return null;
    }

    try {
      const result = this.xmlParser.parse(content) as FastXmlParseDataResult;
      return {
        type: "fast-xml-parser",
        xmlMetaDataSymbol: this.xmlMetaDataSymbol,
        data: result,
        tree: null,
      };
    } catch (error) {
      console.error("Failed to parse XML:", error);
      return null;
    }
  }

  parseXml(content: string): XmlParseResult | null {
    if (this._xmlParserType === "tree-sitter") {
      return this.parseXmlTreeSitter(content);
    } else if (this._xmlParserType === "fast-xml-parser") {
      return this.parseXmlFastXmlParser(content);
    } else {
      return null;
    }
  }

  isInitialized(): boolean {
    return this.xmlParser !== null && this.javaParser !== null;
  }
}
