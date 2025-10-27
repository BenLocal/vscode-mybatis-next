import * as assert from "assert";
import * as vscode from "vscode";
import { XmlAnalyzer } from "../xmlAnalyzer";
import * as fastXmlParser from "fast-xml-parser";


suite("XmlAnalyzer Test Suite", () => {
  test("analyzeMapperXml", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.xxx.TimetableMapper">
    <!-- selectTimetable -->

    <select id="selectTimetable" resultType="com.xxx.entity.Timetable">
        SELECT * FROM timetable WHERE id = #{id}
    </select>
</mapper>
    `;
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      captureMetaData: true,
    };
    const xmlParser = new fastXmlParser.XMLParser(options);
    const xmlMetaDataSymbol = fastXmlParser.XMLParser.getMetaDataSymbol();
    const data = xmlParser.parse(xml);
    console.log(data);
    const result = XmlAnalyzer.analyzeMapperXml({
      type: "fast-xml-parser",
      xmlMetaDataSymbol: xmlMetaDataSymbol,
      data: data,
      tree: null,
    }, xml);
    if (!result) {
      assert.fail("Failed to analyze XML");
    }
    console.log(result);
    assert.equal(result?.namespace, "com.xxx.TimetableMapper");
    assert.equal(result?.sqlStatements.length, 1);
    assert.equal(result?.sqlStatements[0].type, "select");
    assert.equal(result?.sqlStatements[0].id, "selectTimetable");
    assert.equal(result?.sqlStatements[0].resultType, "com.xxx.entity.Timetable");
    assert.equal(result?.sqlStatements[0].resultMap, undefined);
    assert.equal(result?.sqlStatements[0].parameterType, undefined);
  });
});
