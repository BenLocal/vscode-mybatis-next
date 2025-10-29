import * as assert from "assert";
import { MyBatisUtils } from "../mybatisUtils";

suite("MybatisUtils Test Suite", () => {
  test("filePathDistance", () => {
    assert.strictEqual(
      MyBatisUtils.filePathDistance(
        "src/test/testUtils.test.ts",
        "src/test/testUtils.test.ts"
      ),
      0
    );
    assert.strictEqual(
      MyBatisUtils.filePathDistance(
        "src/test/testUtils.test.ts",
        "src/test/A/B/testUtils.test.ts"
      ),
      2
    );
    assert.strictEqual(
      MyBatisUtils.filePathDistance(
        "src/test/A/B/testUtils.test.ts",
        "src/test/testUtils.test.ts"
      ),
      2
    );

    assert.strictEqual(
      MyBatisUtils.filePathDistance(
        "src/test/A/B/testUtils.test.ts",
        "src/test/C/B/testUtils.test.ts"
      ),
      4
    );
  });
});
