import * as vscode from "vscode";
import { OutputLogger } from "./outputLogs";
import { Location, LocationLink } from "vscode-languageserver-types";

type GoToDefinitionResponse = Location | Location[] | LocationLink[] | null;

export class XmlTypeDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | vscode.DefinitionLink[]> {
    const range = document.getWordRangeAtPosition(
      position,
      /[A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)*/
    );
    if (!range) {
      return [];
    }

    try {
      const javaExtension = vscode.extensions.getExtension("redhat.java");
      if (!javaExtension?.isActive) {
        OutputLogger.warn(
          "Java extension (redhat.java) is not available. Please install Java Extension Pack.",
          "XML_TYPE_DEFINITION"
        );
        return [];
      }

      const classSymbolLocations = await this.findClassSymbolLocations(
        document.getText(range)
      );
      if (classSymbolLocations.length > 0) {
        return classSymbolLocations.map((location) => {
          return {
            targetUri: location.uri,
            targetRange: location.range,
            originSelectionRange: range,
            targetSelectionRange: undefined,
          };
        });
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

  private async findClassSymbolLocations(
    fullClassName: string
  ): Promise<vscode.Location[]> {
    const symbols = await vscode.commands.executeCommand<
      vscode.SymbolInformation[]
    >("vscode.executeWorkspaceSymbolProvider", fullClassName);

    if (!symbols || symbols.length === 0) {
      return [];
    }

    const exact = symbols.find((sym) => {
      const container = sym.containerName ?? "";
      const full = container ? `${container}.${sym.name}` : sym.name;
      return full === fullClassName && sym.kind === vscode.SymbolKind.Class;
    });

    if (exact?.location) {
      return [exact.location];
    }

    // 退化为类名匹配
    return symbols
      .filter((sym) => sym.name === fullClassName)
      .map((sym) => sym.location);
  }
}
