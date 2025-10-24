import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";

export async function scanWorkspaceFiles() {
  const { default: pLimit } = await import("p-limit");
  const limit = pLimit(10);
  try {
    const [xmlFiles, javaFiles] = await Promise.all([
      vscode.workspace.findFiles("**/*.xml"),
      vscode.workspace.findFiles("**/*.java"),
    ]);
    const xmlPromises = xmlFiles.map((file) =>
      limit(async () => {
        try {
          const document = await vscode.workspace.openTextDocument(file);
          MappersStore.getInstance().addXmlFile(file, document);
        } catch (error) {
          console.error(`Error parsing XML file ${file.fsPath}:`, error);
        }
      })
    );
    const javaPromises = javaFiles.map((file) =>
      limit(async () => {
        try {
          const document = await vscode.workspace.openTextDocument(file);
          MappersStore.getInstance().addJavaFile(file, document);
        } catch (error) {
          console.error(`Error parsing Java file ${file.fsPath}:`, error);
        }
      })
    );
    await Promise.all([...xmlPromises, ...javaPromises]);
  } catch (error) {
    console.error(error);
  }
}
