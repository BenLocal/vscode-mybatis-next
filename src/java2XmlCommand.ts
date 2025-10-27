import * as vscode from "vscode";
import { MappersStore } from "./mappersStore";
import { MyBatisUtils } from "./mybatisUtils";
import { VscodeUtils } from "./vscodeUtils";

export function registerJava2XmlCommands(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "mybatis-next.java2Xml",
    async (javaFilePath: string, namespace: string, methodName: string) => {
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
        const fileUri = MyBatisUtils.getFilePath(xmlFile.file);
        const xmlDocument = await vscode.workspace.openTextDocument(fileUri);
        const xmlEditor = await vscode.window.showTextDocument(xmlDocument);
        const sqlStatement = xmlFile.info.sqlStatements.find(
          (sqlStatement) => sqlStatement.id === methodName
        );
        if (!sqlStatement) {
          await promptToAddXmlContent(xmlEditor, methodName, namespace);
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

async function promptToAddXmlContent(editor: vscode.TextEditor, methodName: string, namespace: string) {
  // 显示信息提示
  const message = `Method "${methodName}" not found in XML mappings.Add XML content ?`;
  const action = await vscode.window.showInformationMessage(
    message,
    'Add XML Content',
    'Cancel'
  );
  if (action === 'Add XML Content') {
    await addXmlContent(editor, methodName, namespace);
  }

  async function addXmlContent(editor: vscode.TextEditor, methodName: string, namespace: string) {
    const xmlTemplate = generateXmlTemplate(methodName);
    const mapperEndPosition = findBestInsertPosition(editor.document);

    if (mapperEndPosition) {
      await editor.edit(editBuilder => {
        editBuilder.insert(mapperEndPosition, xmlTemplate);
      });

      const newPosition = new vscode.Position(mapperEndPosition.line, mapperEndPosition.character);
      await VscodeUtils.ensurePositionVisible(editor, newPosition);

      const endPosition = new vscode.Position(
        mapperEndPosition.line + xmlTemplate.split('\n').length - 1,
        xmlTemplate.split('\n').pop()?.length || 0
      );
      editor.selection = new vscode.Selection(mapperEndPosition, endPosition);
    } else {
      const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
      const endPosition = new vscode.Position(lastLine.lineNumber, lastLine.text.length);

      await editor.edit(editBuilder => {
        editBuilder.insert(endPosition, '\n' + xmlTemplate);
      });

      const newPosition = new vscode.Position(endPosition.line + 1, 0);
      await VscodeUtils.ensurePositionVisible(editor, newPosition);
    }
  }

  function generateXmlTemplate(methodName: string): string {
    const methodNameLower = methodName.toLowerCase();
    if (methodNameLower.startsWith('select') || methodNameLower.startsWith('get') || methodNameLower.startsWith('find')) {
      return `    <select id = "${methodName}">
    </select>
`;
    } else if (methodNameLower.startsWith('insert') || methodNameLower.startsWith('add') || methodNameLower.startsWith('create')) {
      return `    <insert id = "${methodName}">
    </insert>
`;
    } else if (methodNameLower.startsWith('update') || methodNameLower.startsWith('modify') || methodNameLower.startsWith('edit')) {
      return `    <update id = "${methodName}">
    </update>
`;
    } else if (methodNameLower.startsWith('delete') || methodNameLower.startsWith('remove')) {
      return `    <delete id="${methodName}">
    </delete>
`;
    } else {
      return `    <select id = "${methodName}">
    </select>
`;
    }
  }

  function findBestInsertPosition(document: vscode.TextDocument): vscode.Position | null {
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

async function jumpToXmlStartPosition(javaFilePath: string, namespace: string) {
  const xmlFile = MappersStore.getInstance().selectBestXmlFile(
    javaFilePath,
    namespace
  );
  if (!xmlFile) {
    // try to add xml file
    return;
  }
  const fileUri = MyBatisUtils.getFilePath(xmlFile.file);
  const xmlDocument = await vscode.workspace.openTextDocument(fileUri);
  const xmlEditor = await vscode.window.showTextDocument(xmlDocument);
  const startPosition = new vscode.Position(0, 0);
  await VscodeUtils.ensurePositionVisible(xmlEditor, startPosition);
}
