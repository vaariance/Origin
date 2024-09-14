import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export enum ToastType {
  Success = "lettuce",
  Error = "tomato",
}
