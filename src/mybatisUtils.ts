import { JavaClassInfo } from "./javaAnalyzer";
import * as vscode from "vscode";
import * as treeSitter from "web-tree-sitter";
import * as crypto from "crypto";
import path from "path";

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

  public static treeSitterTypeIs(
    node: treeSitter.Node | null,
    type: string
  ): boolean {
    if (!node) {
      return false;
    }
    return node.type.toLocaleLowerCase() === type.toLocaleLowerCase();
  }

  public static getXmlNodeByType(
    elementNode: treeSitter.Node | null,
    type: string
  ): treeSitter.Node | null {
    if (!elementNode) {
      return null;
    }
    for (let i = 0; i < elementNode.childCount; i++) {
      const child = elementNode.child(i);
      if (MyBatisUtils.treeSitterTypeIs(child, type)) {
        return child;
      }
    }

    return null;
  }

  public static getXmlNodesByType(
    elementNode: treeSitter.Node | null,
    type: string
  ): treeSitter.Node[] {
    if (!elementNode) {
      return [];
    }
    const nodes: treeSitter.Node[] = [];
    for (let i = 0; i < elementNode.childCount; i++) {
      const child = elementNode.child(i);
      if (MyBatisUtils.treeSitterTypeIs(child, type)) {
        nodes.push(child!);
      }
    }
    return nodes;
  }

  public static getXmlValuesByType(
    elementNode: treeSitter.Node | null
  ): Map<string, string> {
    if (!elementNode) {
      return new Map<string, string>();
    }

    const values = new Map<string, string>();
    for (let i = 0; i < elementNode.childCount; i++) {
      const child = elementNode.child(i);
      if (MyBatisUtils.treeSitterTypeIs(child, "name")) {
        values.set("name", child!.text);
      } else if (MyBatisUtils.treeSitterTypeIs(child, "attribute")) {
        const attributeValues = MyBatisUtils.getXmlValuesByType(child);
        let key = attributeValues.get("name") || "";
        let value = MyBatisUtils.parseXmlAttributeValue(
          attributeValues.get("attvalue") || ""
        );
        values.set(key, value);
      } else if (MyBatisUtils.treeSitterTypeIs(child, "attvalue")) {
        values.set("attvalue", child!.text);
      }
    }
    return values;
  }

  public static parseXmlAttributeValue(value: string): string {
    if (!value) {
      return value;
    }

    // 去掉首尾引号
    let result = value.trim();

    // 处理双引号
    if (result.startsWith('"') && result.endsWith('"')) {
      result = result.slice(1, -1);
    }
    // 处理单引号
    else if (result.startsWith("'") && result.endsWith("'")) {
      result = result.slice(1, -1);
    }

    return result;
  }

  public static async calculateContextHash(content: string): Promise<string> {
    const hashBuffer = await crypto.webcrypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(content)
    );
    const hash = Buffer.from(hashBuffer).toString("hex");
    return hash;
  }

  public static filePathDistance(path1: string, path2: string): number {
    try {
      const path1Dir = path.dirname(path.resolve(path1)).toLowerCase();
      const path2Dir = path.dirname(path.resolve(path2)).toLowerCase();
      if (path1Dir === path2Dir) {
        return 0;
      }
      const parts1 = path1Dir.split(path.sep);
      const parts2 = path2Dir.split(path.sep);
      let idx = 0;
      while (
        idx < parts1.length &&
        idx < parts2.length &&
        parts1[idx] === parts2[idx]
      ) {
        idx++;
      }
      const up = parts1.length - idx;
      const down = parts2.length - idx;
      return up + down;
    } catch {
      return -1;
    }
  }
}
