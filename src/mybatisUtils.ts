import { JavaClassInfo } from "./javaAnalyzer";
import * as vscode from "vscode";

export class MyBatisUtils {
  private constructor() {}

  public static getMapperNamespace(classInfo: JavaClassInfo): string {
    if (!classInfo.packageName) {
      return classInfo.className;
    }
    return classInfo.packageName + "." + classInfo.className;
  }

  public static getFilePath(file: vscode.Uri | string): string {
    return typeof file === "string" ? file : file.fsPath;
  }
}
