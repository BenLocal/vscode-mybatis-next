import * as assert from "assert";
import { VscodeUtils } from "../vscodeUtils";


suite("VscodeUtils Test Suite", () => {
  test("filePathDistance", () => {
    assert.strictEqual(
      VscodeUtils.filePathDistance(
        "src/test/testUtils.test.ts",
        "src/test/testUtils.test.ts"
      ),
      0
    );
    assert.strictEqual(
      VscodeUtils.filePathDistance(
        "src/test/testUtils.test.ts",
        "src/test/A/B/testUtils.test.ts"
      ),
      2
    );
    assert.strictEqual(
      VscodeUtils.filePathDistance(
        "src/test/A/B/testUtils.test.ts",
        "src/test/testUtils.test.ts"
      ),
      2
    );

    assert.strictEqual(
      VscodeUtils.filePathDistance(
        "src/test/A/B/testUtils.test.ts",
        "src/test/C/B/testUtils.test.ts"
      ),
      4
    );
  });
});
