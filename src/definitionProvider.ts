import * as vscode from "vscode";
import { OutputLogger } from "./outputLogs";

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

      const classSymbolLocations = await this.findWorkspaceSymbolLocations(
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

  private async findWorkspaceSymbolLocations(
    fullClassName: string
  ): Promise<vscode.Location[]> {
    const className = fullClassName.split(".").pop()!;
    const symbols = await vscode.commands.executeCommand<
      vscode.SymbolInformation[]
    >("vscode.executeWorkspaceSymbolProvider", className);

    if (!symbols || symbols.length === 0) {
      return [];
    }

    const locations = await Promise.all(symbols.map(async (sym) => {
      const container = sym.containerName ?? "";
      const full = container ? `${container}.${sym.name}` : sym.name;
      if (full !== fullClassName) {
        return undefined;
      }

      const doucmentLocation = await this.findDocumentSymbolLocations(sym);
      if (doucmentLocation) {
        return doucmentLocation;
      }

      return undefined;
    }));

    const exactLocations: vscode.Location[] = locations.filter(
      (location): location is vscode.Location => location !== undefined && location !== null
    );

    return exactLocations;
  }

  private async findDocumentSymbolLocations(
    targetSymbol: vscode.SymbolInformation,
  ): Promise<vscode.Location | undefined> {
    const symbols = await vscode.commands.executeCommand<
      vscode.DocumentSymbol[]
    >("vscode.executeDocumentSymbolProvider", targetSymbol.location.uri);
    if (!symbols || symbols.length === 0) {
      return;
    }

    const exactLocation: vscode.DocumentSymbol | undefined = symbols.find((sym) => {
      return sym.kind === targetSymbol.kind && sym.name === targetSymbol.name;
    });

    if (!exactLocation) {
      return;
    }

    const start = exactLocation.selectionRange.start ?? exactLocation.range.start;
    const end = exactLocation.selectionRange.end ?? exactLocation.range.end;
    if (!start || !end) {
      return;
    }

    return exactLocation ? {
      uri: targetSymbol.location.uri,
      range: new vscode.Range(start, end),
    } : undefined;
  }
}
