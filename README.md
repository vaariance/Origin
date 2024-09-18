# Origin

Origin is a mobile wallet application focused on simplifying payments with the Noble blockchain, a USDC-native chain in the Cosmos ecosystem.

## Key Features

1. Noble Chain Integration: Manage your USDC holdings on the Noble blockchain.
2. NFC and HCE Capabilities:
   - Use your phone as a virtual payment card through Host Card Emulation (HCE).
   - Facilitate quick transactions by tapping phones together.
3. Google Sign-In and Cloud Sync:
   - Seamlessly sign in with your Google account.
   - Automatically backup and sync your wallet data to Google Drive, enhancing user experience and security.
4. QR Code Integration: Easily share your wallet address for receiving funds.
5. Simplified Transactions: Send and receive USDC with an intuitive interface.

## How It Works

- NFC and HCE turn your phone into a virtual payment card, enabling contactless transactions with other NFC-enabled devices.
- Google Sign-In and Drive backup ensure your wallet data is securely stored and easily recoverable, improving overall user experience.

## Ideology

Origin aims to make interacting with the Noble blockchain and USDC as simple and secure as using a traditional banking app, while leveraging the benefits of blockchain technology. By integrating familiar technologies like Google Sign-In and innovative features like NFC payments, Origin bridges the gap between traditional finance and DeFi.

## Proxy Usage

Origin utilizes a custom proxy server or cloud function to interact with blockchain nodes, allowing for:

- Efficient handling of complex queries
- Dynamic updating of faulty RPC endpoints without requiring app updates
- Potential for future features like custom relaying and a point system

By abstracting away the complexities of direct blockchain interaction, Origin allows users to focus on managing their assets without computational side-effects

## Getting Started

1. Clone the repository
2. Install dependencies:

   ```sh
   bun install
   ```

    ```sh
   bunx expo install
   ```

3. Set up Google Sign-In:
   - Create a Google Cloud project and enable the Google Sign-In API
   - Configure your OAuth 2.0 client ID
   - Add the client ID to your app configuration
4. Configure Google Drive API for backup functionality
5. Set up your Noble blockchain RPC endpoint in the proxy server configuration
6. Start the development server:

   ```sh
   bunx expo prebuild
   ```

   ```sh
   bun run android
   ```

## Project Structure

- `app/`: Contains the main application code and routes
- `components/`: Reusable React components
- `lib/`: Utility functions and custom hooks
- `context/`: Global state management
- `assets/`: Images and other static assets
- `proxy/`: Backend proxy for blockchain interactions

## Testing

Run tests using Vitest:

```sh
bun run test
```

## Building for Production

Refer to the [`eas.json`](./eas.json) file for EAS (Expo Application Services) build configurations.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
