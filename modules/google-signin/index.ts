import {
  NativeModulesProxy,
  EventEmitter,
  Subscription,
} from "expo-modules-core";

import OneTapGoogleSignInModule from "./src/OneTapGoogleSignInModule";

export async function signIn(clientId: string) {
  return OneTapGoogleSignInModule.signIn(clientId);
}

export async function signOut() {
  return OneTapGoogleSignInModule.signOut();
}

export async function syncSigningKey(data: string) {
  return OneTapGoogleSignInModule.syncSigningKey(data);
}

const emitter = new EventEmitter(
  OneTapGoogleSignInModule ?? NativeModulesProxy.OneTapGoogleSignIn
);

export function addSignInListener(
  listener: (event: any) => void
): Subscription {
  return emitter.addListener("onSignIn", listener);
}

export function removeListener(listener: Subscription) {
  emitter.removeSubscription(listener);
}

export function addSignOutListener(
  listener: (event: any) => void
): Subscription {
  return emitter.addListener("onSignOut", listener);
}

export function addConfigReceivedListener(
  listener: (event: any) => void
): Subscription {
  return emitter.addListener("onConfigReceived", listener);
}

export function addConfigErrorListener(
  listener: (event: any) => void
): Subscription {
  return emitter.addListener("onConfigError", listener);
}

export function addAuthorizationErrorListener(
  listener: (event: any) => void
): Subscription {
  return emitter.addListener("onAuthorizationError", listener);
}
