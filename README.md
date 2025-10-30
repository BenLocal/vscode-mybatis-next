# mybatis-next

一个 VSCode MyBatis 扩展

- Java Mapper 接口和 XML Mapper 文件之间的双向跳转功能。
- XML Mapper 中的 java 类型定义使用 Ctrl+Click(F12),可以跳转到 Java 类定义。

## 安装要求

- VS Code ≥ 1.73
- 安装 VS Code Java 扩展（`redhat.java`），用于类型定义与符号索引

## 使用说明

- 在 Java 接口文件中：
  - 打开接口文件后，方法定义上方会出现 CodeLens“Xml Mapper(...)”
  - 点击可跳转到对应的 XML `id` 位置，不存在时可一键生成模板
- 在 XML 文件中：
  - 文件顶部 CodeLens“Java Mapper”可跳转到对应接口
  - SQL 节点的 CodeLens（如 `select id="xxx"`）可跳转到对应方法
  - 在 `resultType`/`parameterType`/`resultMap` 等属性中，Ctrl+点击类名可跳转到 Java 类定义

## 配置项

在 VS Code 设置中搜索 “MyBatis Next”，支持以下选项：

- Java 扫描
  - `mybatis-next.java.scanPatterns`: 默认为 `["**/*.java"]`
  - `mybatis-next.java.excludePatterns`: 默认为 `["**/node_modules/**", "**/target/**", "**/build/**", "**/.git/**"]`
- XML 扫描
  - `mybatis-next.xml.scanPatterns`: 默认为 `["**/*.xml"]`（需以 `.xml` 结尾）
  - `mybatis-next.xml.excludePatterns`: 同上

示例（settings.json）：

```json
{
  "mybatis-next.java.scanPatterns": ["src/main/java/**/*Mapper.java"],
  "mybatis-next.xml.scanPatterns": ["src/main/resources/mapper/**/*.xml"],
  "mybatis-next.java.excludePatterns": ["**/test/**", "**/example/**"]
}
```
