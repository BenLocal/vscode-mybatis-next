import { FastXmlParseResult } from "./parserManager";

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
    result: FastXmlParseResult,
    content: string
  ): MyBatisMapperInfo | null {
    if (!result) {
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

  private static getPositionFromIndex(
    content: string,
    index: number
  ): { startLine: number; startColumn: number } {
    const lines = content.substring(0, index).split("\n");
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    return {
      startLine: line,
      startColumn: column,
    };
  }
}
