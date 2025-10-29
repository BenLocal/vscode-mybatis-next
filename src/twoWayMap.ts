export class TwoWayMap<K, V> {
  private readonly _keyToValue: Map<K, V>;
  private readonly _valueToKey: Map<V, K>;

  constructor() {
    this._keyToValue = new Map<K, V>();
    this._valueToKey = new Map<V, K>();
  }

  // only add the key to the map
  public onlyAddKey(key: K, value: V): void {
    this._keyToValue.set(key, value);
  }

  // only add the value to the map
  public onlyAddValue(value: V, key: K): void {
    this._valueToKey.set(value, key);
  }

  // if the key is not in the map, will return false
  public hasValue(key: K): boolean {
    return this._keyToValue.has(key);
  }

  // if the value is not in the map, will return false
  public hasKey(value: V): boolean {
    return this._valueToKey.has(value);
  }

  // if the value is not in the map, the key will be undefined
  public getKey(value: V): K | undefined {
    return this._valueToKey.get(value);
  }

  // if the key is not in the map, the value will be undefined
  public getValue(key: K): V | undefined {
    return this._keyToValue.get(key);
  }

  public removeKey(key: K): void {
    const value = this._keyToValue.get(key);
    if (value) {
      const keyToDelete = this._valueToKey.get(value);
      if (keyToDelete && keyToDelete === key) {
        this._valueToKey.delete(value);
      }
    }
    this._keyToValue.delete(key);
  }

  public removeValue(value: V): void {
    const key = this._valueToKey.get(value);
    if (key) {
      const valueToDelete = this._keyToValue.get(key);
      if (valueToDelete && valueToDelete === value) {
        this._keyToValue.delete(key);
      }
    }
    this._valueToKey.delete(value);
  }

  public clear(): void {
    this._keyToValue.clear();
    this._valueToKey.clear();
  }

  public size(): number {
    return this._keyToValue.size;
  }

  public keys(): K[] {
    return Array.from(this._keyToValue.keys());
  }

  public values(): V[] {
    return Array.from(this._valueToKey.keys());
  }

  public entries(): [K, V][] {
    return Array.from(this._keyToValue.entries());
  }
}
