import * as vscode from "vscode";
import { ParserManager } from "./parserManager";
import {
  JavaMapperCodelensProvider,
  XmlMapperCodelensProvider,
} from "./codelensProvider";
import { scanWorkspaceFiles } from "./scanWorkspace";
import { MappersStore } from "./mappersStore";
import { registerJava2XmlCommands } from "./java2XmlCommand";
import { registerXml2JavaCommands } from "./xml2JavaCommand";

let parserManager: ParserManager;
let javaMapperCodelensProvider: JavaMapperCodelensProvider;
let xmlMapperCodelensProvider: XmlMapperCodelensProvider;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "mybatis-next" is now active!');

  // Initialize parser manager
  parserManager = new ParserManager();
  await parserManager.initialize(context);

  MappersStore.getInstance().initialize(context, parserManager);

  javaMapperCodelensProvider = new JavaMapperCodelensProvider();
  vscode.languages.registerCodeLensProvider(
    { language: "java" },
    javaMapperCodelensProvider
  );
  xmlMapperCodelensProvider = new XmlMapperCodelensProvider();
  vscode.languages.registerCodeLensProvider(
    { language: "xml" },
    xmlMapperCodelensProvider
  );

  registerCommands(context);

  await scanWorkspaceFiles();
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Clean up resources if needed
}

function registerCommands(context: vscode.ExtensionContext) {
  // Add command to test parsing
  const parseCommand = vscode.commands.registerCommand(
    "mybatis-next.testParse",
    () => {
      javaMapperCodelensProvider.fire();
    }
  );

  context.subscriptions.push(parseCommand);

  registerJava2XmlCommands(context);
  registerXml2JavaCommands(context);
}
