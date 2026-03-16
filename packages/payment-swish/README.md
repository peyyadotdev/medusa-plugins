# @peyya/medusa-payment-swish

Swish mobile payment provider for Medusa v2. Swish is Sweden's dominant mobile payment method with 8+ million users.

## Features

- Certificate-based mTLS authentication (P12/PEM)
- Async payment flow via webhooks
- Automatic capture on payment confirmation
- Partial and full refund support
- Test and production environment support

## Installation

```bash
npm install @peyya/medusa-payment-swish
```

### Peer Dependencies

- `@medusajs/framework` ^2.5.0
- `@medusajs/medusa` ^2.5.0

## Configuration

Add the plugin and payment provider to your `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  plugins: [
    { resolve: "@peyya/medusa-payment-swish", options: {} },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@peyya/medusa-payment-swish/providers/swish",
            id: "swish",
            options: {
              certificatePath: process.env.SWISH_CERT_PATH,
              certificatePassword: process.env.SWISH_CERT_PASSWORD,
              callbackUrl: process.env.SWISH_CALLBACK_URL,
              payeeAlias: process.env.SWISH_PAYEE_ALIAS,
              environment: process.env.SWISH_ENV || "test",
            },
          },
        ],
      },
    },
  ],
})
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SWISH_CERT_PATH` | Yes | Absolute path to your P12 or PEM certificate file |
| `SWISH_CERT_PASSWORD` | No | Password for the certificate (required for P12) |
| `SWISH_CALLBACK_URL` | Yes | Public HTTPS URL where Swish sends payment callbacks |
| `SWISH_PAYEE_ALIAS` | Yes | Your Swish merchant number (e.g. `1234567890`) |
| `SWISH_ENV` | No | `test` or `production` (defaults to `test`) |

## Certificate Setup

### Test Environment

1. Download the test certificates from the [Swish developer portal](https://developer.swish.nu)
2. The test environment uses a simulator -- no real money is involved
3. Set `SWISH_ENV=test`

### Production Environment

1. Obtain a Swish certificate from your bank
2. The certificate is typically a P12 file with a password
3. Place it in a secure location on your server
4. Set `SWISH_ENV=production`

## Webhook Setup

Medusa automatically exposes a webhook route at:

```
POST /hooks/payment/swish_swish
```

Set your `SWISH_CALLBACK_URL` to your Medusa server's public URL + this path:

```
https://your-medusa-server.com/hooks/payment/swish_swish
```

For local development, use a tunnel service (e.g. ngrok) to expose your local server.

## Payment Flow

1. Customer selects Swish at checkout
2. `initiatePayment` creates a Swish payment request and returns a token
3. Storefront opens the Swish app via deep link or QR code using the token
4. Customer confirms payment in the Swish app
5. Swish sends a callback to your webhook URL
6. `getWebhookActionAndData` processes the callback and authorizes the payment
7. Swish auto-captures immediately -- no separate capture step needed

## Amount Handling

Medusa stores amounts with decimals (e.g. `199.50`). Swish expects integer strings in SEK (e.g. `"200"`). The provider automatically rounds and converts between formats.

## Troubleshooting

### Common certificate errors

- **DEPTH_ZERO_SELF_SIGNED_CERT**: The Swish test certificates are self-signed. Make sure you're using the correct test endpoint.
- **ERR_SSL_VERSION_OR_CIPHER_MISMATCH**: Check that your certificate hasn't expired and the password is correct.
- **ENOENT on certificate path**: Ensure `SWISH_CERT_PATH` is an absolute path and the file exists.

### Webhook not receiving callbacks

- Verify `SWISH_CALLBACK_URL` is publicly accessible (HTTPS required)
- Check that the URL path matches `/hooks/payment/swish_swish`
- In test mode, callbacks may be delayed by a few seconds

## License

MIT
