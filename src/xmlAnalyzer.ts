import { MyBatisUtils } from "./mybatisUtils";
import { XmlParseResult } from "./parserManager";
import * as treeSitter from "web-tree-sitter";

export interface MyBatisMapperInfo {
  namespace?: string;
  sqlStatements: SqlStatementInfo[];
}

export interface SqlStatementInfo {
  type: "select" | "insert" | "update" | "delete";
  id: string;
  parameterType?: string;
  resultType?: string;
  resultMap?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export class XmlAnalyzer {
  static analyzeMapperXml(
    result: XmlParseResult,
    content: string
  ): MyBatisMapperInfo | null {
    if (!result) {
      return null;
    }

    if (result.type === "fast-xml-parser") {
      return this.analyzeMapperXmlFastXmlParser(result, content);
    } else if (result.type === "tree-sitter") {
      return this.analyzeMapperXmlTreeSitter(result, content);
    } else {
      return null;
    }
  }

  static analyzeMapperXmlFastXmlParser(
    result: XmlParseResult,
    content: string
  ): MyBatisMapperInfo | null {
    if (!result || result.type !== "fast-xml-parser") {
      return null;
    }

    const tree = result.data;
    const xmlMetaDataSymbol = result.xmlMetaDataSymbol;
    if (!tree || !xmlMetaDataSymbol) {
      return null;
    }

    if (!tree.mapper) {
      return null;
    }

    const mapperInfo: MyBatisMapperInfo = {
      namespace: tree.mapper["@_namespace"],
      sqlStatements: [],
    };
    const sqlTypes = ["select", "insert", "update", "delete"];

    for (const sqlType of sqlTypes) {
      const statements = tree.mapper[sqlType];
      if (!statements) {
        continue;
      }
      if (Array.isArray(statements)) {
        for (const statement of statements) {
          const metadata = statement[xmlMetaDataSymbol.valueOf()];
          const startIndex = metadata?.startIndex;
          const position = startIndex
            ? this.getPositionFromIndex(content, startIndex)
            : { startLine: 0, startColumn: 0 };
          const sqlStatement: SqlStatementInfo = {
            type: sqlType as any,
            id: statement["@_id"],
            parameterType: statement["@_parameterType"] || undefined,
            resultType: statement["@_resultType"] || undefined,
            resultMap: statement["@_resultMap"] || undefined,
            startLine: position.startLine,
            startColumn: position.startColumn,
            endLine: position.startLine,
            endColumn: position.startColumn,
          };
          mapperInfo.sqlStatements.push(sqlStatement);
        }
      } else if (typeof statements === "object") {
        const statement = statements;
        const metadata = statement[xmlMetaDataSymbol.valueOf()];
        const startIndex = metadata?.startIndex;
        const position = startIndex
          ? this.getPositionFromIndex(content, startIndex)
          : { startLine: 0, startColumn: 0 };
        const sqlStatement: SqlStatementInfo = {
          type: sqlType as any,
          id: statement["@_id"],
          parameterType: statement["@_parameterType"] || undefined,
          resultType: statement["@_resultType"] || undefined,
          resultMap: statement["@_resultMap"] || undefined,
          startLine: position.startLine,
          startColumn: position.startColumn,
          endLine: position.startLine,
          endColumn: position.startColumn,
        };
        mapperInfo.sqlStatements.push(sqlStatement);
      }
    }

    return mapperInfo;
  }

  static analyzeMapperXmlTreeSitter(
    result: XmlParseResult,
    content: string
  ): MyBatisMapperInfo | null {
    if (!result) {
      return null;
    }
    if (result.type !== "tree-sitter") {
      return null;
    }
    const tree = result.tree;
    if (!tree) {
      return null;
    }
    const rootNode = tree.rootNode;
    if (!rootNode) {
      return null;
    }
    const mapperInfo: MyBatisMapperInfo = {
      namespace: undefined,
      sqlStatements: [],
    };
    const { mapperNode, namespace } = this.findMapperNodeAndNamespace(rootNode);
    if (!mapperNode) {
      return null;
    }
    mapperInfo.namespace = namespace;


    // 提取 SQL 语句
    const sqlTypes = ["select", "insert", "update", "delete"];
    mapperInfo.sqlStatements = this.findSqlNodesAndExtractSqlStatement(mapperNode, sqlTypes);

    return mapperInfo;
  }

  private static findMapperNodeAndNamespace(rootNode: treeSitter.Node): { mapperNode: treeSitter.Node | null, namespace: string | undefined } {
    // 遍历所有子节点查找 mapper 元素
    for (let i = 0; i < rootNode.childCount; i++) {
      const child = rootNode.child(i);
      if (MyBatisUtils.treeSitterTypeIs(child, "element") && child!.firstChild) {
        const { name, namespace } = this.getMapperTagNameAndNamespace(child!);
        if (name) {
          return { mapperNode: child, namespace };
        }
      }
    }
    return { mapperNode: null, namespace: undefined };
  }

  private static getMapperTagNameAndNamespace(elementNode: treeSitter.Node): { name: string | null, namespace: string | undefined } {
    for (let i = 0; i < elementNode.childCount; i++) {
      const child = elementNode.child(i);
      if (MyBatisUtils.treeSitterTypeIs(child, "stag")) {
        const values = MyBatisUtils.getXmlValuesByType(child);
        const name = values.get("name") || null;
        const namespace = values.get("namespace") || undefined;

        if (name === "mapper") {
          return { name, namespace };
        }
      }
    }
    return { name: null, namespace: undefined };
  }

  private static findSqlNodesAndExtractSqlStatement(mapperNode: treeSitter.Node, sqlTypes: string[]): SqlStatementInfo[] {
    const infos: SqlStatementInfo[] = [];

    const findTagsInSqlTypes = (node: treeSitter.Node, sqlTypes: string[]): {
      name: string | null,
      info: SqlStatementInfo | null
    } => {
      let name: string | null = null;
      let info: SqlStatementInfo = {
        type: "" as any,
        id: "",
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 0,
        parameterType: undefined,
        resultType: undefined,
        resultMap: undefined,
      };
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (MyBatisUtils.treeSitterTypeIs(child, "stag")) {
          const values = MyBatisUtils.getXmlValuesByType(child);
          const vname = values.get("name") || null;
          if (!vname || !sqlTypes.includes(vname?.toLocaleLowerCase())) {
            break;
          }
          name = vname;
          info.type = vname?.toLocaleLowerCase() as any;
          info.id = values.get("id") || "";
          info.parameterType = values.get("parameterType") || undefined;
          info.resultType = values.get("resultType") || undefined;
          info.resultMap = values.get("resultMap") || undefined;
        }
      }

      info.startLine = node!.startPosition.row;
      info.startColumn = node!.startPosition.column;
      info.endLine = node!.endPosition.row;
      info.endColumn = node!.endPosition.column;
      return { name: name, info: info };
    };

    const findSqlNodesRecursive = (node: treeSitter.Node, type: string) => {
      const content = MyBatisUtils.getXmlNodeByType(node, "content");
      if (content) {
        const childrens = MyBatisUtils.getXmlNodesByType(content, "element");
        for (const child of childrens) {
          const { name, info } = findTagsInSqlTypes(child, sqlTypes);
          if (name && info) {
            infos.push(info);
          }
        }
      }
    };

    findSqlNodesRecursive(mapperNode, "content");
    return infos;
  }

  private static extractSqlStatement(
    sqlNode: treeSitter.Node,
    sqlType: string,
    content: string
  ): SqlStatementInfo | null {
    let id: string | undefined;
    let parameterType: string | undefined;
    let resultType: string | undefined;
    let resultMap: string | undefined;

    // 提取属性
    for (let i = 0; i < sqlNode.childCount; i++) {
      const child = sqlNode.child(i);
      if (child && child.type === "attribute") {
        const attributeText = child.text;

        const idMatch = attributeText.match(/id\s*=\s*["']([^"']+)["']/);
        if (idMatch) {
          id = idMatch[1];
        }

        const parameterTypeMatch = attributeText.match(/parameterType\s*=\s*["']([^"']+)["']/);
        if (parameterTypeMatch) {
          parameterType = parameterTypeMatch[1];
        }

        const resultTypeMatch = attributeText.match(/resultType\s*=\s*["']([^"']+)["']/);
        if (resultTypeMatch) {
          resultType = resultTypeMatch[1];
        }

        const resultMapMatch = attributeText.match(/resultMap\s*=\s*["']([^"']+)["']/);
        if (resultMapMatch) {
          resultMap = resultMapMatch[1];
        }
      }
    }

    if (!id) {
      return null;
    }

    // 计算位置信息
    const startPosition = sqlNode.startPosition;
    const endPosition = sqlNode.endPosition;

    return {
      type: sqlType as any,
      id,
      parameterType,
      resultType,
      resultMap,
      startLine: startPosition.row,
      startColumn: startPosition.column,
      endLine: endPosition.row,
      endColumn: endPosition.column,
    };
  }

  private static getPositionFromIndex(
    content: string,
    index: number
  ): { startLine: number; startColumn: number } {
    const lines = content.split('\n');
    let processedContent = '';
    let lineOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const processedLine = line.replace(/<!--[\s\S]*?-->/g, '');
      processedContent += processedLine + '\n';
      if (line !== processedLine) {
        lineOffset += (line.length - processedLine.length);
      }
    }

    const processedLines = processedContent.substring(0, index).split("\n");
    const line = processedLines.length - 1;
    const column = processedLines[processedLines.length - 1].length;

    return {
      startLine: line,
      startColumn: column,
    };
  }
}
