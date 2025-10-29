import * as vscode from "vscode";
import { OutputLogger } from "./outputLogs";

export class XmlTypeDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | vscode.DefinitionLink[]> {
    try {
      const lineText = document.lineAt(position.line).text;
      const lineIndex = position.line;
      const charIndex = position.character;

      // 优化的正则：匹配属性名 = "值" 或 '值'
      // 支持 resultType, parameterType, resultMap, type 等属性
      const attributePattern =
        /(resultType|parameterType|resultMap|type)\s*=\s*(["'])([^"']+)\2/gi;

      let match: RegExpExecArray | null;
      let foundMatch: RegExpExecArray | null = null;

      // 查找所有匹配的属性
      while ((match = attributePattern.exec(lineText)) !== null) {
        const valueStart = match.index + match[1].length; // 属性名结束位置
        const quoteStart = match.index + match[0].indexOf(match[2]); // 引号开始位置
        const valueContent = match[3]; // 引号内的内容
        const valueContentStart = quoteStart + 1; // 引号内内容开始位置（跳过引号）
        const valueContentEnd = valueContentStart + valueContent.length;

        // 检查光标是否在这个属性值的引号内部
        if (
          charIndex >= valueContentStart &&
          charIndex <= valueContentEnd &&
          valueContent.length > 0
        ) {
          foundMatch = match;
          break;
        }
      }

      if (!foundMatch) {
        return [];
      }

      // 提取完整的类名
      const fullClassName = foundMatch[3].trim();

      if (!fullClassName || fullClassName.length === 0) {
        return [];
      }

      OutputLogger.debug(
        `Found class name in XML: ${fullClassName} at line ${lineIndex + 1}`,
        "XML_TYPE_DEFINITION"
      );

      // 检查 Java 插件是否可用
      const javaExtension = vscode.extensions.getExtension("redhat.java");
      if (!javaExtension || !javaExtension.isActive) {
        OutputLogger.warn(
          "Java extension (redhat.java) is not available. Please install Java Extension Pack.",
          "XML_TYPE_DEFINITION"
        );
        return [];
      }
      let javaApi = javaExtension.exports;
      if (typeof javaApi.navigateToTypeDefinition === "function") {
        const result = await javaApi.navigateToTypeDefinition(fullClassName);
        if (result) {
          return Array.isArray(result) ? result : [result];
        }
      }

      // 使用 Java 插件的符号搜索
      const className = fullClassName.split(".").pop() || "";

      // 使用 workspace symbol 搜索
      const symbols = await vscode.commands.executeCommand<
        vscode.SymbolInformation[]
      >("vscode.executeWorkspaceSymbolProvider", className);

      if (!symbols || symbols.length === 0) {
        OutputLogger.debug(
          `No symbols found for class name: ${className}`,
          "XML_TYPE_DEFINITION"
        );
        return [];
      }

      // 优先查找完全匹配的类（根据完整类名）
      const fullMatch = symbols.find((symbol) => {
        // 尝试构建完整类名
        const containerName = symbol.containerName || "";
        let fullName = "";

        if (containerName) {
          // 如果容器名是包名的一部分
          if (containerName.includes(".")) {
            fullName = `${containerName}.${symbol.name}`;
          } else {
            // 如果容器名是外层类名
            fullName = `${containerName}.${symbol.name}`;
          }
        } else {
          fullName = symbol.name;
        }

        return fullName === fullClassName;
      });

      if (fullMatch && fullMatch.location) {
        OutputLogger.debug(
          `Found exact match: ${fullClassName} -> ${fullMatch.location.uri.fsPath}`,
          "XML_TYPE_DEFINITION"
        );
        return [fullMatch.location];
      }

      // 如果找不到完整匹配，尝试只匹配类名（忽略包名）
      const classNameMatch = symbols.find(
        (symbol) =>
          symbol.name === className && symbol.kind === vscode.SymbolKind.Class
      );

      if (classNameMatch && classNameMatch.location) {
        OutputLogger.debug(
          `Found class name match: ${className} -> ${classNameMatch.location.uri.fsPath}`,
          "XML_TYPE_DEFINITION"
        );
        return [classNameMatch.location];
      }

      return [];
    } catch (error) {
      OutputLogger.errorWithStackTrace(
        `Error providing definition:`,
        error as Error,
        "XML_TYPE_DEFINITION"
      );
      return [];
    }
  }
}
