import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { OutputLogger } from "./outputLogs";

function getJavaScanPatterns(): {
  patterns: string[];
  excludePatterns: string[];
} {
  const config = vscode.workspace.getConfiguration("mybatis-next.java");
  const patterns = config.get<string[]>("scanPatterns", ["**/*.java"]);
  const excludePatterns = config.get<string[]>("excludePatterns", [
    "**/node_modules/**",
    "**/target/**",
    "**/build/**",
    "**/.git/**",
  ]);
  return { patterns, excludePatterns };
}

function getXmlScanPatterns(): {
  patterns: string[];
  excludePatterns: string[];
} {
  const config = vscode.workspace.getConfiguration("mybatis-next.xml");
  const patterns = config.get<string[]>("scanPatterns", ["**/*.xml"]);
  const excludePatterns = config.get<string[]>("excludePatterns", [
    "**/node_modules/**",
    "**/target/**",
    "**/build/**",
    "**/.git/**",
  ]);
  return { patterns, excludePatterns };
}

function getGlobPattern(patterns: string[]): string {
  if (patterns.length === 0) {
    return "**/*";
  }
  if (patterns.length === 1) {
    return patterns[0];
  }

  let str = "{";
  for (const p of patterns) {
    str += p + ",";
  }
  str += "}";
  return str;
}

export async function scanWorkspaceFiles() {
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (
      e.affectsConfiguration("mybatis-next.java.scanPatterns") ||
      e.affectsConfiguration("mybatis-next.xml.scanPatterns") ||
      e.affectsConfiguration("mybatis-next.java.excludePatterns") ||
      e.affectsConfiguration("mybatis-next.xml.excludePatterns")
    ) {
      OutputLogger.info(
        "Configuration changed, scanning workspace",
        "SCAN_WORKSPACE"
      );
      MappersStore.getInstance().cleanup();
      vscode.window.setStatusBarMessage(
        "Mybatis.Next: configuration changed, scanning workspace",
        3000
      );
      scanWorkspaceFiles();
    }
  });

  const { default: pLimit } = await import("p-limit");
  const limit = pLimit(10);
  try {
    const { patterns: javaScanPatterns, excludePatterns: javaExcludePatterns } =
      getJavaScanPatterns();
    const { patterns: xmlScanPatterns, excludePatterns: xmlExcludePatterns } =
      getXmlScanPatterns();
    OutputLogger.info(
      `Scanning Java files with patterns: ${javaScanPatterns.join(", ")}`,
      "SCAN_WORKSPACE"
    );
    OutputLogger.info(
      `Excluding Java files with patterns: ${javaExcludePatterns.join(", ")}`,
      "SCAN_WORKSPACE"
    );
    OutputLogger.info(
      `Scanning XML files with patterns: ${xmlScanPatterns.join(", ")}`,
      "SCAN_WORKSPACE"
    );
    OutputLogger.info(
      `Excluding XML files with patterns: ${xmlExcludePatterns.join(", ")}`,
      "SCAN_WORKSPACE"
    );

    const [xmlFiles, javaFiles] = await Promise.all([
      vscode.workspace.findFiles(
        getGlobPattern(xmlScanPatterns),
        getGlobPattern(xmlExcludePatterns)
      ),
      vscode.workspace.findFiles(
        getGlobPattern(javaScanPatterns),
        getGlobPattern(javaExcludePatterns)
      ),
    ]);
    const totalFiles = xmlFiles.length + javaFiles.length;
    OutputLogger.info(
      `Total files to process: ${totalFiles}, XML files: ${xmlFiles.length}, Java files: ${javaFiles.length}`,
      "SCAN_WORKSPACE_RESULT"
    );
    let processedFiles = 0;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Scanning MyBatis files",
        cancellable: false,
      },
      async (progress) => {
        const xmlPromises = xmlFiles.map((file) =>
          limit(async () => {
            try {
              const document = await vscode.workspace.openTextDocument(file);
              const result = await MappersStore.getInstance().addXmlFile(
                file,
                document
              );
              if (result) {
                OutputLogger.info(
                  `Parsed XML file ${file.fsPath}`,
                  "SCAN_WORKSPACE"
                );
              }
            } catch (error) {
              OutputLogger.errorWithStackTrace(
                `Error parsing XML file ${file.fsPath}:`,
                error as Error
              );
            } finally {
              processedFiles++;
              progress.report({
                increment: 100 / totalFiles,
                message: `Processed ${processedFiles} of ${totalFiles} files`,
              });
            }
          })
        );
        const javaPromises = javaFiles.map((file) =>
          limit(async () => {
            try {
              const document = await vscode.workspace.openTextDocument(file);
              const result = await MappersStore.getInstance().addJavaFile(
                file,
                document
              );
              if (result) {
                OutputLogger.info(
                  `Parsed Java file ${file.fsPath}`,
                  "SCAN_WORKSPACE"
                );
              }
            } catch (error) {
              OutputLogger.errorWithStackTrace(
                `Error parsing Java file ${file.fsPath}`,
                error as Error
              );
            } finally {
              processedFiles++;
              progress.report({
                increment: 100 / totalFiles,
                message: `Processed ${processedFiles} of ${totalFiles} files`,
              });
            }
          })
        );
        await Promise.all([...xmlPromises, ...javaPromises]);
      }
    );
  } catch (error) {
    OutputLogger.errorWithStackTrace(
      `Error scanning workspace files`,
      error as Error,
      "SCAN_WORKSPACE"
    );
  }
}
