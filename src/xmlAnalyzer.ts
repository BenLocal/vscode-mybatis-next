import * as treeSitter from "web-tree-sitter";
import { TextPosition } from "./vscodeUtils";

export interface MyBatisMapperInfo {
  namespace?: TextPosition | null;
  sqlStatements: SqlStatementInfo[];
}

export interface SqlStatementInfo {
  type: "select" | "insert" | "update" | "delete";
  id?: TextPosition;
  parameterType?: TextPosition;
  resultType?: TextPosition;
  resultMap?: TextPosition;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

const XML_FILE_QUERY: string = `
(document
  root: (element
    (STag
      (Name) @mapper_name (#eq? @mapper_name "mapper")
      (Attribute
        (Name) @attr_name (#eq? @attr_name "namespace")
        (AttValue) @namespace_value
      )
    ) @mapper_stag
    (content
      (element
        (STag
          (Name) @sql_tag_name
          (Attribute
            (Name) @sql_attr_name
            (AttValue) @sql_attr_value
          )*
        ) @sql_stag
        (content)* @sql_content
      ) @sql_element
    )*
  ) @mapper_element
)
    `;

export class XmlAnalyzer {
  static analyzeTree(tree: treeSitter.Tree): MyBatisMapperInfo | null {
    if (!tree) {
      return null;
    }

    const query = new treeSitter.Query(tree.language, XML_FILE_QUERY);
    const matches = query.matches(tree.rootNode);
    if (matches.length === 0) {
      return null;
    }

    const mapperInfo: MyBatisMapperInfo = {
      namespace: undefined,
      sqlStatements: [],
    };

    const sqlElementsMap = new Map<
      treeSitter.Node,
      {
        tagName: string;
        attributes: Map<string, TextPosition>;
        elementNode: treeSitter.Node;
      }
    >();

    for (const match of matches) {
      let namespaceValue: string | undefined = undefined;
      let sqlElementNode: treeSitter.Node | null = null;
      let sqlTagName = "";
      const sqlAttrs = new Map<string, TextPosition>();

      // 处理每个 capture
      for (const capture of match.captures) {
        const node = capture.node;
        const captureName = capture.name;

        switch (captureName) {
          case "namespace_value":
            namespaceValue = this.extractAttributeValue(node.text);
            if (namespaceValue) {
              mapperInfo.namespace = TextPosition.createByNode(namespaceValue, node);
            }
            break;

          case "sql_element":
            sqlElementNode = node;
            break;

          case "sql_tag_name":
            sqlTagName = node.text.toLowerCase();
            break;

          case "sql_attr_name":
            {
              const attrValue = this.findAttributeValueInMatch(match, node);
              if (attrValue) {
                sqlAttrs.set(node.text, attrValue);
              }
              break;
            }

          case "sql_attr_value":
            break;
        }
      }

      if (
        sqlElementNode &&
        sqlTagName &&
        ["select", "insert", "update", "delete"].includes(sqlTagName)
      ) {
        if (sqlElementsMap.has(sqlElementNode)) {
          const existing = sqlElementsMap.get(sqlElementNode)!;
          for (const [key, value] of sqlAttrs) {
            existing.attributes.set(key, value);
          }
        } else {
          sqlElementsMap.set(sqlElementNode, {
            tagName: sqlTagName,
            attributes: new Map(sqlAttrs),
            elementNode: sqlElementNode,
          });
        }
      }
    }

    for (const [node, info] of sqlElementsMap) {
      const sqlStatement: SqlStatementInfo = {
        type: info.tagName as "select" | "insert" | "update" | "delete",
        id: info.attributes.get("id") || undefined,
        parameterType: info.attributes.get("parameterType") || undefined,
        resultType: info.attributes.get("resultType") || undefined,
        resultMap: info.attributes.get("resultMap") || undefined,
        startLine: node.startPosition.row,
        startColumn: node.startPosition.column,
        endLine: node.endPosition.row,
        endColumn: node.endPosition.column,
      };
      mapperInfo.sqlStatements.push(sqlStatement);
    }

    return mapperInfo.namespace ? mapperInfo : null;
  }

  private static extractAttributeValue(attrValueText: string): string {
    let value = attrValueText.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  private static findAttributeValueInMatch(
    match: treeSitter.QueryMatch,
    attrNameNode: treeSitter.Node
  ): TextPosition | null {
    const parent = attrNameNode.parent;
    if (parent?.type !== "Attribute") {
      return null;
    }

    for (let i = 0; i < parent.childCount; i++) {
      const child = parent.child(i);
      if (child?.type === "AttValue") {
        return TextPosition.createByNode(this.extractAttributeValue(child.text), child);
      }
    }

    return null;
  }
}
