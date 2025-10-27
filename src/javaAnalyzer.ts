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
  isStatic: boolean;
  isPublic: boolean;
  isPrivate: boolean;
  isProtected: boolean;
  isAbstract: boolean;
  line: number;
  column: number;
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

    const rootNode = tree.rootNode;
    const classInfo: JavaClassInfo = {
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

    // 遍历 AST 节点
    this.traverseNode(rootNode, classInfo);

    return classInfo.className ? classInfo : null;
  }

  private static traverseNode(
    node: treeSitter.Node,
    classInfo: JavaClassInfo
  ): void {
    this.processNode(node, classInfo);

    // 递归遍历子节点
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.traverseNode(child, classInfo);
      }
    }
  }

  private static processNode(
    node: treeSitter.Node,
    classInfo: JavaClassInfo
  ): void {
    switch (node.type) {
      case "package_declaration":
        classInfo.packageName = this.extractPackageName(node);
        break;

      case "import_declaration": {
        const importName = this.extractImportName(node);
        if (importName) {
          classInfo.imports.push(importName);
        }
        break;
      }

      case "class_declaration":
        this.processClassDeclaration(node, classInfo, "class");
        break;

      case "interface_declaration":
        this.processClassDeclaration(node, classInfo, "interface");
        break;

      case "enum_declaration":
        this.processClassDeclaration(node, classInfo, "enum");
        break;

      case "annotation_type_declaration":
        this.processClassDeclaration(node, classInfo, "annotation");
        break;

      case "method_declaration": {
        const methodInfo = this.extractMethodInfo(node);
        if (methodInfo) {
          classInfo.methods.push(methodInfo);
        }
        break;
      }
    }
  }

  private static processClassDeclaration(
    node: treeSitter.Node,
    classInfo: JavaClassInfo,
    classType: JavaClassInfo["classType"]
  ): void {
    if (!classInfo.className) {
      classInfo.className = this.extractIdentifierName(node);
      classInfo.classType = classType;
      classInfo.classPosition = {
        startLine: node.startPosition.row,
        startColumn: node.startPosition.column,
        endLine: node.endPosition.row,
        endColumn: node.endPosition.column,
      };
    }
  }

  private static extractPackageName(node: treeSitter.Node): string {
    // 查找 package 声明中的标识符
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        if (child.type === "scoped_identifier" || child.type === "identifier") {
          return child.text;
        }
      }
    }
    return "";
  }

  private static extractImportName(node: treeSitter.Node): string | null {
    // 查找 import 声明中的标识符
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (
        child &&
        (child.type === "scoped_identifier" || child.type === "identifier")
      ) {
        return child.text;
      }
    }
    return null;
  }

  private static extractIdentifierName(node: treeSitter.Node): string {
    // 查找节点中的标识符
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === "identifier") {
        return child.text;
      }
    }
    return "";
  }

  private static extractClassName(node: treeSitter.Node): string {
    return this.extractIdentifierName(node);
  }

  private static extractInterfaceName(node: treeSitter.Node): string {
    return this.extractIdentifierName(node);
  }

  private static extractEnumName(node: treeSitter.Node): string {
    return this.extractIdentifierName(node);
  }

  private static extractAnnotationName(node: treeSitter.Node): string {
    return this.extractIdentifierName(node);
  }

  private static extractMethodInfo(
    node: treeSitter.Node
  ): JavaMethodInfo | null {
    const methodInfo: JavaMethodInfo = {
      name: "",
      parameters: [],
      isStatic: false,
      isPublic: false,
      isPrivate: false,
      isProtected: false,
      isAbstract: false,
      line: node.startPosition.row,
      column: node.startPosition.column,
      startLine: node.startPosition.row,
      startColumn: node.startPosition.column,
      endLine: node.endPosition.row,
      endColumn: node.endPosition.column,
    };

    // 提取修饰符
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        switch (child.type) {
          case "modifiers":
            this.extractModifiers(child, methodInfo);
            break;
          case "identifier":
            if (!methodInfo.name) {
              methodInfo.name = child.text;
            }
            break;
          case "formal_parameters":
            methodInfo.parameters = this.extractParameters(child);
            break;
          case "type":
            methodInfo.returnType = child.text;
            break;
        }
      }
    }

    return methodInfo.name ? methodInfo : null;
  }

  private static extractModifiers(
    node: treeSitter.Node,
    methodInfo: JavaMethodInfo
  ): void {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === "identifier") {
        switch (child.text) {
          case "public":
            methodInfo.isPublic = true;
            break;
          case "private":
            methodInfo.isPrivate = true;
            break;
          case "protected":
            methodInfo.isProtected = true;
            break;
          case "static":
            methodInfo.isStatic = true;
            break;
          case "abstract":
            methodInfo.isAbstract = true;
            break;
        }
      }
    }
  }

  private static extractParameters(node: treeSitter.Node): string[] {
    const parameters: string[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === "formal_parameter") {
        // 提取参数类型和名称
        const paramType = this.extractParameterType(child);
        const paramName = this.extractParameterName(child);
        if (paramType && paramName) {
          parameters.push(`${paramType} ${paramName}`);
        }
      }
    }

    return parameters;
  }

  private static extractParameterType(node: treeSitter.Node): string {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (
        child &&
        (child.type === "type" || child.type === "scoped_type_identifier")
      ) {
        return child.text;
      }
    }
    return "";
  }

  private static extractParameterName(node: treeSitter.Node): string {
    return this.extractIdentifierName(node);
  }
}
