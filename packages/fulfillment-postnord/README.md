# @peyya/medusa-fulfillment-postnord

PostNord shipping provider for [Medusa v2](https://medusajs.com/). Provides Nordic shipping with MyPack Home/Collect, parcel, pallet, return labels, shipment tracking, and pickup point lookup.

## Features

- **MyPack Home** — home delivery up to 20 kg
- **MyPack Collect** — pickup point delivery up to 20 kg
- **Parcel** — standard parcel up to 30 kg
- **Pallet** — pallet delivery up to 1000 kg
- **Return** — return label generation up to 20 kg
- **Tracking** — real-time shipment tracking via PostNord Tracking API
- **Pickup Points** — service point lookup by postal code or coordinates
- **Labels** — PDF shipping label generation via Transport Solutions API
- **Rate Calculation** — live shipping rates from PostNord

## Installation

```bash
npm install @peyya/medusa-fulfillment-postnord
# or
yarn add @peyya/medusa-fulfillment-postnord
```

## Configuration

Add the provider to your `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [{
        resolve: "@peyya/medusa-fulfillment-postnord/providers/postnord",
        id: "postnord",
        options: {
          apiKey: process.env.POSTNORD_API_KEY,
          customerNumber: process.env.POSTNORD_CUSTOMER_NUMBER,
          senderAddress: {
            name: "My Store AB",
            street: "Storgatan 1",
            postalCode: "11122",
            city: "Stockholm",
            countryCode: "SE",
          },
          environment: process.env.POSTNORD_ENV || "test",
        },
      }],
    },
  }],
})
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | `string` | Yes | PostNord API key |
| `customerNumber` | `string` | Yes | PostNord customer/agreement number |
| `senderAddress.name` | `string` | Yes | Sender name |
| `senderAddress.street` | `string` | Yes | Sender street address |
| `senderAddress.postalCode` | `string` | Yes | Sender postal code |
| `senderAddress.city` | `string` | Yes | Sender city |
| `senderAddress.countryCode` | `string` | Yes | Sender ISO country code (e.g. `"SE"`) |
| `environment` | `"test" \| "production"` | No | API environment (default: `"test"`) |

### Environment Variables

```env
POSTNORD_API_KEY=your-api-key
POSTNORD_CUSTOMER_NUMBER=your-customer-number
POSTNORD_ENV=test
```

## Available Services

| Service ID | Name | Pickup Point | Max Weight |
|-----------|------|--------------|------------|
| `mypack_home` | PostNord MyPack Home | No | 20 kg |
| `mypack_collect` | PostNord MyPack Collect | Required | 20 kg |
| `parcel` | PostNord Parcel | No | 30 kg |
| `pallet` | PostNord Pallet | No | 1000 kg |
| `return` | PostNord Return | No | 20 kg |

## Pickup Point Integration

Query available pickup points for MyPack Collect from your storefront:

```
GET /store/fulfillment/postnord/service-points?postal_code=11143&country=SE&limit=10
```

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `postal_code` | Yes | Postal code to search near |
| `country` | Yes | ISO country code |
| `limit` | No | Max results (default: 10) |
| `street` | No | Street name for precision |

### Response

```json
{
  "service_points": [
    {
      "servicePointId": "SP-001",
      "name": "ICA Maxi Kungsgatan",
      "street": "Kungsgatan 10",
      "postalCode": "11143",
      "city": "Stockholm",
      "countryCode": "SE",
      "coordinates": {
        "latitude": 59.3326,
        "longitude": 18.0649
      },
      "openingHours": [
        { "day": "Monday", "openFrom": "08:00", "openTo": "21:00" }
      ],
      "distance": 250
    }
  ]
}
```

## Tracking

Query tracking status for a shipment:

```
GET /store/fulfillment/postnord/tracking?tracking_number=XXXXX
```

### Response

```json
{
  "tracking": {
    "trackingNumber": "XXXXX",
    "carrier": "postnord",
    "trackingUrl": "https://tracking.postnord.com/tracking?id=XXXXX",
    "status": "In transit",
    "estimatedDelivery": "2025-01-15T12:00:00Z",
    "events": [
      {
        "eventCode": "09",
        "eventDescription": "Out for delivery",
        "location": "Stockholm",
        "timestamp": "2025-01-15T08:00:00Z",
        "status": "out_for_delivery"
      }
    ]
  }
}
```

## PostNord API Environments

| Environment | Base URL |
|-------------|----------|
| Test | `https://atapi2.postnord.com` |
| Production | `https://api2.postnord.com` |

Get your API credentials from [PostNord Developer Portal](https://developer.postnord.com/).

## License

MIT
