import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Buffer as bf } from "@craftzdog/react-native-buffer";

export type SerializableResult<T, E> =
  | {
      ok: false;
      value?: undefined;
      error: E;
      info?: unknown;
    }
  | {
      ok: true;
      value: T;
      error?: undefined;
      info?: undefined;
    };

export type Result<T, E = string> = SerializableResult<T, E> & {
  unwrap(): T;
  unwrap_err(): E;
  unwrap_or(default_value: T): T;
  map_err<F>(f: (e: E) => F): Result<T, F>;
  map<U>(f: (v: T) => U): Result<U, E>;
};

export const Result = <T, E>(res: SerializableResult<T, E>): Result<T, E> =>
  res.ok ? Ok(res.value) : Err(res.error);

export const Err = <E>(error: E, info?: unknown): Result<never, E> => ({
  ok: false,
  info,
  error,
  unwrap: () => {
    throw error;
  },
  unwrap_err: () => error,
  unwrap_or: <T>(default_value: T): T => default_value,
  map_err: <F>(f: (e: E) => F): Result<never, F> => Err(f(error)),
  map: (): Result<never, E> => Err(error),
});

export const Ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
  unwrap: () => value,
  unwrap_err: () => {
    throw new Error(`Not an error. Has value: ${value}`);
  },
  unwrap_or: <F>(_: F): T => value,
  map_err: <F>(_: (e: never) => F): Result<T, F> => Ok(value),
  map: <U>(f: (v: T) => U): Result<U, never> => Ok(f(value)),
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function textDecoder(encoding: "UTF-8" | "UTF-16") {
  if (encoding === "UTF-8") {
    return (buffer: Uint8Array) => {
      return bf.from(buffer).toString(encoding);
    };
  } else if (encoding === "UTF-16") {
    return (bytes: Uint8Array) => {
      let textChars = [];
      for (let i = 0; i < bytes.length; i += 2) {
        let codeUnit = (bytes[i] << 8) | bytes[i + 1];
        textChars.push(String.fromCharCode(codeUnit));
      }
      return textChars.join("");
    };
  }
}

export const decodeNDEFTextRecord = (byteArray: Uint8Array) => {
  if (
    byteArray[byteArray.length - 2] === 0x90 &&
    byteArray[byteArray.length - 1] === 0x00
  ) {
    byteArray = byteArray.slice(0, -2);
  }

  const header = byteArray[0];
  const tnf = header & 0x07;
  const sr = (header & 0x10) !== 0;

  if (tnf !== 0x01) {
    throw new Error("Not a Well Known Type record");
  }

  const typeLength = byteArray[1];
  const payloadLength = byteArray[2];
  const type = byteArray.slice(3, 3 + typeLength);

  if (String.fromCharCode(...type) !== "T") {
    throw new Error("Not a Text record");
  }

  const payload = byteArray.slice(
    3 + typeLength,
    3 + typeLength + payloadLength
  );

  const statusByte = payload[0];
  const encoding = statusByte & 0x80 ? "UTF-16" : "UTF-8";
  const languageCodeLength = statusByte & 0x3f;
  const languageCodeBytes = payload.slice(1, 1 + languageCodeLength);
  const languageCode = String.fromCharCode.apply(
    null,
    Array.from(languageCodeBytes)
  );

  const textBytes = payload.slice(1 + languageCodeLength);
  const decode = textDecoder(encoding);
  const text = decode?.(textBytes);

  return {
    encoding: encoding,
    languageCode: languageCode,
    text,
  };
};
