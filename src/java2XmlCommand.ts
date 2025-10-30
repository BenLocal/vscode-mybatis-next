import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { VscodeUtils } from "./vscodeUtils";
import { OutputLogger } from "./outputLogs";

export function registerJava2XmlCommands(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "mybatis-next.java2Xml",
    async (
      javaFilePath: string,
      namespace: string,
      methodName: string,
      returnType: string
    ) => {
      try {
        if (!methodName) {
          // class codelens
          await jumpToXmlStartPosition(javaFilePath, namespace);
          return;
        }

        const xmlFile = MappersStore.getInstance().selectBestXmlFile(
          javaFilePath,
          namespace
        );
        if (!xmlFile) {
          return;
        }
        const sqlStatement = xmlFile.info.sqlStatements.find(
          (sqlStatement) => sqlStatement.id?.text === methodName
        );

        const fileUri = VscodeUtils.getFilePath(xmlFile.file);
        const xmlDocument = await vscode.workspace.openTextDocument(fileUri);
        const xmlEditor = await vscode.window.showTextDocument(xmlDocument);
        if (!sqlStatement) {
          await promptToAddXmlContent(
            xmlEditor,
            methodName,
            namespace,
            returnType
          );
          return;
        }
        const startPosition = new vscode.Position(
          sqlStatement.startLine,
          sqlStatement.startColumn
        );
        await VscodeUtils.ensurePositionVisible(xmlEditor, startPosition);
      } catch (error) {
        console.error(`Error opening XML file:`, error);
      }
    }
  );
  context.subscriptions.push(disposable);
}

async function promptToAddXmlContent(
  editor: vscode.TextEditor,
  methodName: string,
  namespace: string,
  returnType: string
) {
  // 显示信息提示
  const message = `Method "${methodName}" not found in XML mappings.Add XML content ?`;
  const action = await vscode.window.showInformationMessage(
    message,
    "Add XML Content",
    "Cancel"
  );
  if (action === "Add XML Content") {
    await addXmlContent(editor, methodName, namespace, returnType);
  }

  async function addXmlContent(
    editor: vscode.TextEditor,
    methodName: string,
    namespace: string,
    returnType: string
  ) {
    const xmlTemplate = generateXmlTemplate(methodName, returnType);
    const mapperEndPosition = findBestInsertPosition(editor.document);

    if (mapperEndPosition) {
      await editor.edit((editBuilder) => {
        editBuilder.insert(mapperEndPosition, xmlTemplate);
      });

      const newPosition = new vscode.Position(
        mapperEndPosition.line,
        mapperEndPosition.character
      );
      await VscodeUtils.ensurePositionVisible(editor, newPosition);

      const endPosition = new vscode.Position(
        mapperEndPosition.line + xmlTemplate.split("\n").length - 1,
        xmlTemplate.split("\n").pop()?.length || 0
      );
      editor.selection = new vscode.Selection(mapperEndPosition, endPosition);
    } else {
      const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
      const endPosition = new vscode.Position(
        lastLine.lineNumber,
        lastLine.text.length
      );

      await editor.edit((editBuilder) => {
        editBuilder.insert(endPosition, "\n" + xmlTemplate);
      });

      const newPosition = new vscode.Position(endPosition.line + 1, 0);
      await VscodeUtils.ensurePositionVisible(editor, newPosition);
    }
  }

  function findBestInsertPosition(
    document: vscode.TextDocument
  ): vscode.Position | null {
    const text = document.getText();
    const mapperEndMatch = text.match(/<\/mapper>/);

    if (mapperEndMatch) {
      const index = mapperEndMatch.index!;
      const position = document.positionAt(index);
      return position;
    }

    const lastLine = document.lineAt(document.lineCount - 1);
    return new vscode.Position(lastLine.lineNumber, lastLine.text.length);
  }
}

function generateXmlTemplate(methodName: string, returnType: string): string {
  const methodNameLower = methodName.toLowerCase();
  let resultType = "";
  if (returnType) {
    resultType = ` resultType="${returnType.trim()}"`;
  }
  if (
    methodNameLower.startsWith("insert") ||
    methodNameLower.startsWith("add") ||
    methodNameLower.startsWith("create")
  ) {
    return `    <insert id = "${methodName}"${resultType}>
    </insert>
`;
  } else if (
    methodNameLower.startsWith("update") ||
    methodNameLower.startsWith("modify") ||
    methodNameLower.startsWith("edit")
  ) {
    return `    <update id = "${methodName}"${resultType}>
    </update>
`;
  } else if (
    methodNameLower.startsWith("delete") ||
    methodNameLower.startsWith("remove")
  ) {
    return `    <delete id="${methodName}"${resultType}>
    </delete>
`;
  } else {
    return `    <select id = "${methodName}"${resultType}>
    </select>
`;
  }
}

async function jumpToXmlStartPosition(javaFilePath: string, namespace: string) {
  const xmlFile = MappersStore.getInstance().selectBestXmlFile(
    javaFilePath,
    namespace
  );
  if (!xmlFile) {
    await promptToCreateXmlFile(javaFilePath, namespace);
    return;
  }
  const fileUri = VscodeUtils.getFilePath(xmlFile.file);
  const xmlDocument = await vscode.workspace.openTextDocument(fileUri);
  const xmlEditor = await vscode.window.showTextDocument(xmlDocument);
  const startPosition = new vscode.Position(0, 0);
  await VscodeUtils.ensurePositionVisible(xmlEditor, startPosition);
}

async function promptToCreateXmlFile(javaFilePath: string, namespace: string) {
  const message = `No XML mapper found for namespace "${namespace}".\n
Create new XML mapper file?`;
  const action = await vscode.window.showInformationMessage(
    message,
    "Create XML File",
    "Cancel"
  );

  if (action === "Create XML File") {
    await createNewXmlMapperFile(javaFilePath, namespace);
  }
}

async function createNewXmlMapperFile(javaFilePath: string, namespace: string) {
  try {
    const folderUris = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Select Folder",
      title: "Select folder for XML mapper file",
    });

    if (!folderUris || folderUris.length === 0) {
      return;
    }
    const selectedFolder = folderUris[0];

    const fileName = await vscode.window.showInputBox({
      prompt: "Enter XML mapper file name",
      placeHolder: "e.g., UserMapper.xml",
      value: `${namespace.split(".").pop()}.xml`,
      validateInput: (value) => {
        if (!value) {
          return "Please enter a file name";
        }
        if (!value.endsWith(".xml")) {
          return "File must have .xml extension";
        }
        return null;
      },
    });

    if (!fileName) {
      return;
    }
    const fileUri = vscode.Uri.joinPath(selectedFolder, fileName);
    try {
      await vscode.workspace.fs.stat(fileUri);
      const overwrite = await vscode.window.showWarningMessage(
        `File ${fileName} already exists. Overwrite?`,
        "Overwrite",
        "Cancel"
      );
      if (overwrite !== "Overwrite") {
        return;
      }
    } catch (error) {
      OutputLogger.errorWithStackTrace(
        `Error checking if XML mapper file exists: ${error}`,
        error as Error
      );
    }
    const xmlContent = generateCompleteXmlMapperTemplate(namespace);
    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(xmlContent, "utf8")
    );
    const document = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(document);
    const startPosition = new vscode.Position(0, 0);
    await VscodeUtils.ensurePositionVisible(editor, startPosition);
    await MappersStore.getInstance().addXmlFile(fileUri, document);
  } catch (error) {
    console.error("Error creating XML mapper file:", error);
    vscode.window.showErrorMessage(
      `Failed to create XML mapper file: ${error}`
    );
  }
}

function generateCompleteXmlMapperTemplate(namespace: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="${namespace}">

</mapper>`;
}
