# Use redhat.java

## export api

### goToDefinition

- main.ts

```typescript
const javaExtension = vscode.extensions.getExtension("redhat.java");
if (!javaExtension?.isActive) {
  OutputLogger.warn(
    "Java extension (redhat.java) is not available. Please install Java Extension Pack.",
    "XML_TYPE_DEFINITION"
  );
  return [];
}

const javaApi = javaExtension.exports;
const fileUri = vscode.Uri.file("xxx.java");
const request = {
  textDocument: { uri: fileUri.toString() },
  position: { line: 15, character: 8 },
};
const javaResults: GoToDefinitionResponse = await javaApi?.goToDefinition?.(
  request
);

return normalizeDefinition(javaResults, range);
```

- normalize.ts

```typescript
normalizeDefinition(
    resp: GoToDefinitionResponse | undefined,
    originSelectionRange: vscode.Range
  ): vscode.Definition | vscode.LocationLink[] {
    if (!resp) {
      return [];
    }

    if (Location.is(resp)) {
      const uri = vscode.Uri.parse(resp.uri.toString());
      const range = new vscode.Range(
        new vscode.Position(resp.range.start.line, resp.range.start.character),
        new vscode.Position(resp.range.end.line, resp.range.end.character)
      );
      const ll: vscode.LocationLink = {
        targetUri: uri,
        targetRange: range,
        originSelectionRange: originSelectionRange,
        targetSelectionRange: undefined,
      };
      return [ll];
    }

    if (Array.isArray(resp)) {
      if (resp.length === 0) {
        return [];
      }
      return resp.map((item) => {
        if (Location.is(item)) {
          const uri = vscode.Uri.parse(item.uri.toString());
          const range = new vscode.Range(
            new vscode.Position(
              item.range.start.line,
              item.range.start.character
            ),
            new vscode.Position(item.range.end.line, item.range.end.character)
          );
          return {
            targetUri: uri,
            targetRange: range,
            originSelectionRange: originSelectionRange,
            targetSelectionRange: undefined,
          } as vscode.LocationLink;
        } else if (LocationLink.is(item)) {
          const targetUri = vscode.Uri.parse(item.targetUri.toString());
          let originSelectionRange = null;
          if (item.originSelectionRange) {
            originSelectionRange = new vscode.Range(
              new vscode.Position(
                item.originSelectionRange.start.line,
                item.originSelectionRange.start.character
              ),
              new vscode.Position(
                item.originSelectionRange.end.line,
                item.originSelectionRange.end.character
              )
            );
          }
          const targetRange = new vscode.Range(
            new vscode.Position(
              item.targetRange.start.line,
              item.targetRange.start.character
            ),
            new vscode.Position(
              item.targetRange.end.line,
              item.targetRange.end.character
            )
          );
          let targetSelectionRange = null;
          if (item.targetSelectionRange) {
            targetSelectionRange = new vscode.Range(
              new vscode.Position(
                item.targetSelectionRange.start.line,
                item.targetSelectionRange.start.character
              ),
              new vscode.Position(
                item.targetSelectionRange.end.line,
                item.targetSelectionRange.end.character
              )
            );
          }
          return {
            targetUri,
            targetRange,
            originSelectionRange: originSelectionRange,
            targetSelectionRange: targetSelectionRange,
          } as vscode.LocationLink;
        }
      }) as vscode.Location[] | vscode.LocationLink[];
    }

    return [];
  }
```
