# node-client-proxy

A simple proxy to route blockchain node request via cloud function

WHY proxying calls?

I transcribed cosmos-accounts related crypto APIs to work with native environment [here](../lib/cosmos/). However, Its better for my mental health to just proxy client ops, since we are no longer dealing with user keys.

Think of it as the app backend now, we could do more stuffs in the future like Use Tipping, custom relaying, point system etc, plus dynamically change faulty RPC url's without having the users update their apps.
