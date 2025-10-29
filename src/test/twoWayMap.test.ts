import * as assert from "assert";
import { TwoWayMap } from "../twoWayMap";

suite("TwoWayMap Test Suite", () => {
  test("addFromKey", () => {
    const map = new TwoWayMap<string, string>();
    map.onlyAddKey("key1", "value1");
    map.onlyAddValue("value1", "key1");
    map.onlyAddKey("key2", "value2");
    map.onlyAddValue("value2", "key2");
    map.onlyAddValue("value3", "key1");
    map.onlyAddValue("value2", "key3");
    map.onlyAddKey("key2", "value3");
    assert.strictEqual(map.getValue("key1"), "value1");
    assert.strictEqual(map.getKey("value1"), "key1");
    assert.strictEqual(map.getValue("key2"), "value3");
    assert.strictEqual(map.getKey("value2"), "key3");
    assert.strictEqual(map.getKey("value3"), "key1");
  });

  test("removeKey", () => {
    const map = new TwoWayMap<string, string>();
    map.onlyAddKey("key1", "value1");
    map.onlyAddValue("value2", "key1");
    map.removeKey("key1");
    assert.strictEqual(map.getValue("key1"), undefined);
    assert.strictEqual(map.getKey("value2"), "key1");

    const map2 = new TwoWayMap<string, string>();
    map2.onlyAddKey("key1", "value1");
    map2.onlyAddValue("value2", "key1");
    map2.removeValue("value2");
    assert.strictEqual(map2.getValue("key1"), "value1");
    assert.strictEqual(map2.getKey("value2"), undefined);

    const map3 = new TwoWayMap<string, string>();
    map3.onlyAddKey("key1", "value1");
    map3.onlyAddValue("value1", "key1");
    map3.removeKey("key1");
    assert.strictEqual(map3.getValue("key1"), undefined);
    assert.strictEqual(map3.getKey("value1"), undefined);
  });

  test("clear", () => {
    const map = new TwoWayMap<string, string>();
    map.onlyAddKey("key1", "value1");
    map.onlyAddValue("value1", "key1");
    assert.strictEqual(map.size(), 1);
    map.clear();
    assert.strictEqual(map.size(), 0);
  });
});
