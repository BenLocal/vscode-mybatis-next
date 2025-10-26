import * as assert from "assert";
import * as crypto from "crypto";

suite("Crypto Test Suite", () => {
  test("SHA-256", async () => {
    const content = new TextEncoder().encode("Hello, world!");
    const hashBuffer = await crypto.webcrypto.subtle.digest("SHA-256", content);
    const hash = Buffer.from(hashBuffer).toString("hex");
    console.log(hash);
    assert.equal(
      hash,
      "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
    );
  });
});
