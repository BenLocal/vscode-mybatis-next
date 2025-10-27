import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { OutputLogger } from "./outputLogs";

export async function scanWorkspaceFiles() {
  const { default: pLimit } = await import("p-limit");
  const limit = pLimit(10);
  try {
    const [xmlFiles, javaFiles] = await Promise.all([
      vscode.workspace.findFiles("**/*.xml"),
      vscode.workspace.findFiles("**/*.java"),
    ]);
    const totalFiles = xmlFiles.length + javaFiles.length;
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
              console.error(`Error parsing Java file ${file.fsPath}:`, error);
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
    console.error(error);
  }
}
