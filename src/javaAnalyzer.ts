import * as treeSitter from "web-tree-sitter";

export interface JavaClassInfo {
  packageName?: string;
  className: string;
  classType: "class" | "interface" | "enum" | "annotation";
  methods: JavaMethodInfo[];
  imports: string[];
  classPosition: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface JavaMethodInfo {
  name: string;
  returnType?: string;
  parameters: string[];
  parameterStr: string;
  isStatic: boolean;
  isPublic: boolean;
  isPrivate: boolean;
  isProtected: boolean;
  isAbstract: boolean;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export class JavaAnalyzer {
  static analyzeTree(tree: treeSitter.Tree): JavaClassInfo | null {
    if (!tree) {
      return null;
    }
    const scm = `
(program
  (package_declaration (scoped_identifier) @package_name)?
  (import_declaration (scoped_identifier) @import_name)*
  (interface_declaration
  	(modifiers)? @interface_modifiers
    name: (identifier) @interface_name
    body: (interface_body
    	(method_declaration
          (modifiers)* @method_modifiers
          type: (_) @method_return
          name: (identifier) @method_name
          parameters: (formal_parameters) @method_parameters
        ) @method_decl
    )
  ) @interface_decl
)
    `;
    const query = new treeSitter.Query(tree.language, scm);
    const matches = query.matches(tree.rootNode);
    if (matches.length === 0) {
      return null;
    }

    let info: JavaClassInfo = {
      className: "",
      classType: "class",
      methods: [],
      imports: [],
      classPosition: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 0,
      },
    };
    let queryClassInfo = false;
    for (const match of matches) {
      this.queryClassInfo(match, info, queryClassInfo);
      queryClassInfo = true;
    }

    return info;
  }

  static queryClassInfo(
    match: treeSitter.QueryMatch,
    info: JavaClassInfo,
    queryClassInfo: boolean
  ): void {
    let methodInfo: JavaMethodInfo = {
      name: "",
      parameters: [],
      parameterStr: "",
      isStatic: false,
      isPublic: false,
      isPrivate: false,
      isProtected: false,
      isAbstract: false,
      startLine: 0,
      startColumn: 0,
      endLine: 0,
      endColumn: 0,
      returnType: "",
    };

    for (const capture of match.captures) {
      const node = capture.node;
      const captureName = capture.name;
      switch (captureName) {
        case "package_name":
          if (queryClassInfo) {
            continue;
          }

          info.packageName = node.text;
          break;
        case "import_name":
          if (queryClassInfo) {
            continue;
          }
          info.imports.push(node.text);
          break;
        case "interface_name":
          if (queryClassInfo) {
            continue;
          }
          info.className = node.text;
          info.classType = "interface";
          info.classPosition = {
            startLine: node.startPosition.row,
            startColumn: node.startPosition.column,
            endLine: node.endPosition.row,
            endColumn: node.endPosition.column,
          };
          break;
        case "method_decl":
          methodInfo.startLine = node.startPosition.row;
          methodInfo.startColumn = node.startPosition.column;
          methodInfo.endLine = node.endPosition.row;
          methodInfo.endColumn = node.endPosition.column;
          break;
        case "method_modifiers":
          const modifiers = this.extractJavaMethodModifiers(capture.node);
          if (modifiers.includes("default") || modifiers.includes("static")) {
            return;
          }
          break;
        case "method_return":
          let returnType = capture.node.text.trim();
          if (returnType === "void" || capture.node.type === "void_type") {
            returnType = "void";
          }
          methodInfo.returnType = returnType;
          break;
        case "method_name":
          methodInfo.name = node.text;
          break;
        case "method_parameters":
          methodInfo.parameterStr =
            this.extractJavaMethodParametersString(node);
          methodInfo.parameters = this.extractJavaMethodParameters(node);
          break;
      }
    }

    if (methodInfo.name) {
      info.methods.push(methodInfo);
    }
  }

  private static extractJavaMethodModifiers(node: treeSitter.Node): string[] {
    const modifiers: string[] = [];

    if (node.type === "modifiers") {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === "modifier") {
          modifiers.push(child.text.trim());
        }
      }
    }

    return modifiers;
  }

  private static extractJavaMethodParametersString(
    node: treeSitter.Node
  ): string {
    const parameters = node.text.trim();
    if (parameters.startsWith("(") && parameters.endsWith(")")) {
      return parameters.slice(1, -1);
    }
    return parameters;
  }

  private static extractJavaMethodParameters(node: treeSitter.Node): string[] {
    const parameters: string[] = [];

    if (node.type === "formal_parameters") {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === "formal_parameter") {
          parameters.push(child.text.trim());
        }
      }
    }

    return parameters;
  }
}
