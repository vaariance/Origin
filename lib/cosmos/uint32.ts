import { BN } from "bn.js";

export class Uint32 {
  data: number;
  /** @deprecated use Uint32.fromBytes */
  static fromBigEndianBytes(bytes: Uint8Array) {
    return Uint32.fromBytes(bytes);
  }
  /**
   * Creates a Uint32 from a fixed length byte array.
   *
   * @param bytes a list of exactly 4 bytes
   * @param endianess defaults to big endian
   */
  static fromBytes(bytes: Uint8Array, endianess = "be") {
    if (bytes.length !== 4) {
      throw new Error("Invalid input length. Expected 4 bytes.");
    }
    for (let i = 0; i < bytes.length; ++i) {
      if (!Number.isInteger(bytes[i]) || bytes[i] > 255 || bytes[i] < 0) {
        throw new Error("Invalid value in byte. Found: " + bytes[i]);
      }
    }
    const beBytes = endianess === "be" ? bytes : Array.from(bytes).reverse();
    // Use mulitiplication instead of shifting since bitwise operators are defined
    // on SIGNED int32 in JavaScript and we don't want to risk surprises
    return new Uint32(
      beBytes[0] * 2 ** 24 +
        beBytes[1] * 2 ** 16 +
        beBytes[2] * 2 ** 8 +
        beBytes[3]
    );
  }
  static fromString(str: string) {
    if (!str.match(/^[0-9]+$/)) {
      throw new Error("Invalid string format");
    }
    return new Uint32(Number.parseInt(str, 10));
  }
  constructor(input: number) {
    if (Number.isNaN(input)) {
      throw new Error("Input is not a number");
    }
    if (!Number.isInteger(input)) {
      throw new Error("Input is not an integer");
    }
    if (input < 0 || input > 4294967295) {
      throw new Error("Input not in uint32 range: " + input.toString());
    }
    this.data = input;
  }
  toBytesBigEndian() {
    // Use division instead of shifting since bitwise operators are defined
    // on SIGNED int32 in JavaScript and we don't want to risk surprises
    return new Uint8Array([
      Math.floor(this.data / 2 ** 24) & 0xff,
      Math.floor(this.data / 2 ** 16) & 0xff,
      Math.floor(this.data / 2 ** 8) & 0xff,
      Math.floor(this.data / 2 ** 0) & 0xff,
    ]);
  }
  toBytesLittleEndian() {
    // Use division instead of shifting since bitwise operators are defined
    // on SIGNED int32 in JavaScript and we don't want to risk surprises
    return new Uint8Array([
      Math.floor(this.data / 2 ** 0) & 0xff,
      Math.floor(this.data / 2 ** 8) & 0xff,
      Math.floor(this.data / 2 ** 16) & 0xff,
      Math.floor(this.data / 2 ** 24) & 0xff,
    ]);
  }
  toNumber() {
    return this.data;
  }
  toBigInt() {
    return new BN(this.toNumber());
  }
  toString() {
    return this.data.toString();
  }
}
