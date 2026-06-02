# SwapSmart Backend - Serverless Lambda Functions

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Node.js%2020-339933?style=flat-square&logo=nodedotjs" alt="Node.js 20" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Testing-Vitest%20+%20fast--check-6E9F18?style=flat-square" alt="Testing" />
  <img src="https://img.shields.io/badge/AWS-Lambda%20+%20DynamoDB-FF9900?style=flat-square&logo=amazonaws" alt="AWS" />
</p>

The backend consists of **9 serverless Lambda services** that power the SwapSmart platform. Each service is independently deployable, follows single-responsibility principles, and communicates via EventBridge events.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (REST + WebSocket)                │
│                     + Cognito Authorizer + WAF                    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐  ┌──────────────▼──────────┐  ┌────────▼────────┐
   │  Auth   │  │  Availability  │ Reserv. │  │  Swap  │ Wallet │
   │ Service │  │    Service     │ Service │  │ Service│ Service│
   └────┬────┘  └──────┬────────┴────┬────┘  └───┬────┴───┬────┘
        │               │             │           │        │
   ┌────▼────┐  ┌──────▼─────┐  ┌────▼────┐  ┌──▼────────▼──┐
   │ Cognito │  │   Redis    │  │DynamoDB │  │  EventBridge  │
   │  + OTP  │  │  (Cache)   │  │(Primary)│  │   (Events)    │
   └─────────┘  └────────────┘  └─────────┘  └───────┬───────┘
                                                      │
                              ┌────────────────────────┼──────────┐
                              │                        │          │
                         ┌────▼─────┐  ┌──────────────▼──┐  ┌───▼────┐
                         │Prediction│  │  Notification   │  │ Health │
                         │ Service  │  │    Service      │  │Service │
                         └────┬─────┘  └────────┬────────┘  └───┬────┘
                              │                 │                │
                         ┌────▼─────┐  ┌────────▼────────┐  ┌───▼──────┐
                         │ Bedrock  │  │   SNS (Push)    │  │SageMaker │
                         │  (AI)    │  │   SMS Gateway   │  │(ML Model)│
                         └──────────┘  └─────────────────┘  └──────────┘
```

---

## Directory Structure

```
backend/
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── vitest.config.ts             # Test runner configuration
└── src/
    ├── auth/                    # Authentication & OTP service
    │   ├── handler.ts           # Lambda entry point
    │   ├── auth.service.ts      # Registration, login logic
    │   ├── otp.service.ts       # OTP generation & verification
    │   └── handler.test.ts      # Unit tests
    ├── availability/            # Station availability & search
    │   ├── handler.ts           # Lambda entry point
    │   ├── station.service.ts   # Nearby search, availability queries
    │   └── station.service.test.ts
    ├── reservation/             # Battery reservation lifecycle
    │   ├── handler.ts           # Lambda entry point
    │   ├── reservation.service.ts # Create, arrive, cancel, expire
    │   ├── state-machine.ts     # Reservation state transitions
    │   └── state-machine.test.ts
    ├── swap/                    # Swap transaction processing
    │   ├── handler.ts           # Lambda entry point
    │   ├── swap.service.ts      # Start swap, complete, rate
    │   └── handler.test.ts
    ├── wallet/                  # Wallet & payment integration
    │   ├── handler.ts           # Lambda entry point
    │   ├── wallet.service.ts    # Balance, top-up, debit
    │   ├── paystack.ts          # Paystack payment gateway client
    │   ├── paystack.test.ts
    │   └── handler.test.ts
    ├── prediction/              # AI demand prediction
    │   ├── handler.ts           # Lambda entry point
    │   └── prediction.service.ts # Bedrock integration
    ├── health/                  # Battery health scoring
    │   ├── handler.ts           # Lambda entry point
    │   └── health.service.ts    # SageMaker inference
    ├── ai-assistant/            # AI chat assistant
    │   └── handler.ts           # Bedrock conversational AI
    ├── shared/                  # Shared utilities
    │   ├── index.ts             # Barrel export
    │   ├── dynamo.ts            # DynamoDB document client
    │   ├── redis.ts             # Redis connection manager
    │   ├── authorizer.ts        # API Gateway Lambda authorizer
    │   ├── authorize.ts         # Role-based access control
    │   ├── authorize.test.ts
    │   ├── input-validator.ts   # Zod schema validation middleware
    │   ├── input-validator.test.ts
    │   ├── validation.ts        # Shared Zod schemas
    │   ├── response.ts          # Standardized API responses
    │   ├── audit.ts             # Audit logging utility
    │   ├── mask.ts              # Data masking (phone, email)
    │   └── mask.test.ts
    └── __tests__/
        ├── helpers/             # Test factories & arbitraries
        │   ├── operations.arbitrary.ts
        │   ├── reservation.factory.ts
        │   ├── station.factory.ts
        │   └── wallet.factory.ts
        ├── properties/          # Property-based tests (fast-check)
        │   ├── auth.property.test.ts
        │   ├── battery.property.test.ts
        │   ├── cost.property.test.ts
        │   ├── health.property.test.ts
        │   ├── inventory.property.test.ts
        │   ├── notification.property.test.ts
        │   ├── reservation.property.test.ts
        │   ├── swap.property.test.ts
        │   ├── telemetry.property.test.ts
        │   ├── ui-state.property.test.ts
        │   └── wallet.property.test.ts
        └── integration/         # Integration tests
            ├── dynamodb-transactions.test.ts
            └── redis-atomic.test.ts
```

---

## API Endpoints

### Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/auth/register` | Create account (phone, name, role) |
| `POST` | `/v1/auth/otp/request` | Request OTP for phone number |
| `POST` | `/v1/auth/otp/verify` | Verify OTP, receive JWT tokens |
| `POST` | `/v1/auth/refresh` | Refresh access token |
| `POST` | `/v1/auth/logout` | Revoke session |

### Driver Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/stations` | List nearby stations (lat, lng, radius) |
| `GET` | `/v1/stations/{stationId}` | Station detail with live availability |
| `POST` | `/v1/reservations` | Create battery reservation |
| `GET` | `/v1/reservations/active` | Get active reservation |
| `PATCH` | `/v1/reservations/{id}/arrive` | Confirm arrival at station |
| `PATCH` | `/v1/reservations/{id}/cancel` | Cancel reservation |
| `GET` | `/v1/wallet` | Wallet balance + recent transactions |
| `POST` | `/v1/wallet/topup` | Initiate Paystack top-up |
| `POST` | `/v1/wallet/topup/callback` | Payment gateway webhook |
| `GET` | `/v1/profile` | Driver profile |
| `GET` | `/v1/swaps/history` | Swap history with filters |
| `POST` | `/v1/swaps/{id}/rate` | Rate a completed swap |
| `GET` | `/v1/predictions/swap-time` | AI recommended swap time |
| `POST` | `/v1/ai/chat` | AI assistant message |
| `GET` | `/v1/notifications` | List notifications |
| `PATCH` | `/v1/notifications/read` | Mark notifications as read |

### Station Operator Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/operator/dashboard` | Dashboard metrics |
| `GET` | `/v1/operator/inventory` | Battery inventory |
| `PATCH` | `/v1/operator/batteries/{id}/state` | Update battery state |
| `GET` | `/v1/operator/reservations` | Reservation queue |
| `PATCH` | `/v1/operator/reservations/{id}/confirm-arrival` | Confirm driver arrival |
| `PATCH` | `/v1/operator/reservations/{id}/start-swap` | Initiate swap |
| `PATCH` | `/v1/operator/reservations/{id}/complete-swap` | Complete swap |
| `PATCH` | `/v1/operator/reservations/{id}/extend` | Extend reservation hold |
| `PATCH` | `/v1/operator/reservations/{id}/cancel` | Cancel and release battery |
| `GET` | `/v1/operator/analytics` | Revenue & performance analytics |
| `GET` | `/v1/operator/alerts` | Active alerts |
| `PATCH` | `/v1/operator/alerts/{id}/resolve` | Resolve alert |
| `GET` | `/v1/operator/settings` | Station settings |
| `PUT` | `/v1/operator/settings` | Update station settings |
| `GET` | `/v1/operator/forecast` | AI demand forecast |

### Fleet Manager Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/fleet/overview` | Fleet status metrics |
| `GET` | `/v1/fleet/vehicles` | Vehicle list with status |
| `GET` | `/v1/fleet/vehicles/{id}` | Vehicle detail |
| `GET` | `/v1/fleet/drivers` | Driver list |
| `PATCH` | `/v1/fleet/vehicles/{id}/assign` | Assign driver to vehicle |
| `GET` | `/v1/fleet/cost-analysis` | Cost comparison data |
| `GET` | `/v1/fleet/maintenance` | Maintenance health |
| `GET` | `/v1/fleet/reports/export` | Export report (CSV) |
| `GET` | `/v1/fleet/telemetry/{vehicleId}` | Vehicle telemetry history |

### WebSocket Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| `station/{stationId}/availability` | Server to Client | Real-time battery counts |
| `reservation/{id}/status` | Server to Client | Reservation state changes |
| `fleet/{fleetId}/telemetry` | Server to Client | Vehicle telemetry updates |
| `user/{userId}/notifications` | Server to Client | Push notifications |

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ENVIRONMENT` | Deployment environment (dev/staging/prod) | Yes |
| `TABLE_NAME` | DynamoDB primary table name | Yes |
| `LEDGER_TABLE_NAME` | DynamoDB ledger table name | Yes |
| `REDIS_URL` | ElastiCache Redis endpoint | Yes |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID | Yes |
| `COGNITO_CLIENT_ID` | Cognito App Client ID | Yes |
| `EVENT_BUS_NAME` | EventBridge bus name | Yes |
| `SNS_TOPIC_ARN` | SNS notification topic ARN | Yes |
| `PAYSTACK_SECRET_KEY` | Paystack API secret key | Yes |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook HMAC secret | Yes |
| `BEDROCK_MODEL_ID` | Bedrock model ID for predictions | Yes |
| `SAGEMAKER_ENDPOINT` | SageMaker health scoring endpoint | Yes |
| `MAP_PLACE_INDEX` | Amazon Location place index name | Yes |
| `ROUTE_CALCULATOR` | Amazon Location route calculator | Yes |

---

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
```

### Running Locally with SAM

```bash
# From the infrastructure/ directory
sam local start-api --env-vars env.json

# Invoke a single function
sam local invoke AuthFunction --event events/auth-register.json
```

---

## Testing

### Test Strategy

SwapSmart uses a **property-based testing** approach with `fast-check` to verify system invariants hold across thousands of random inputs, complemented by traditional unit and integration tests.

### Property-Based Tests (11 suites, 17+ properties)

| Suite | Properties Verified |
|-------|-------------------|
| `auth.property` | OTP generation bounds, token format invariants, rate limit monotonicity |
| `battery.property` | State machine transition validity, charge level bounds [0-100] |
| `cost.property` | Pricing non-negativity, discount monotonicity, total consistency |
| `health.property` | Health score bounds [0-100], degradation monotonicity |
| `inventory.property` | Stock conservation (total = available + reserved + charging + maintenance) |
| `notification.property` | Delivery guarantee, deduplication, ordering |
| `reservation.property` | State machine validity, expiry correctness, no double-booking |
| `swap.property` | Transaction integrity, idempotency, receipt uniqueness |
| `telemetry.property` | Data bounds, timestamp ordering, GPS coordinate validity |
| `ui-state.property` | Theme consistency, offline state transitions |
| `wallet.property` | Balance non-negativity, ledger sum = balance, credit/debit symmetry |

### Unit Tests

| Service | File | Coverage |
|---------|------|----------|
| Auth | `auth/handler.test.ts` | Registration, OTP flow, token refresh |
| Availability | `availability/station.service.test.ts` | Nearby search, availability queries |
| Reservation | `reservation/state-machine.test.ts` | All state transitions, invalid transitions |
| Swap | `swap/handler.test.ts` | Start, complete, rate flows |
| Wallet | `wallet/handler.test.ts`, `wallet/paystack.test.ts` | Balance, top-up, webhook verification |
| Shared | `shared/authorize.test.ts`, `shared/input-validator.test.ts`, `shared/mask.test.ts` | RBAC, validation, masking |

### Integration Tests

| Suite | Description |
|-------|-------------|
| `dynamodb-transactions.test.ts` | TransactWriteItems atomicity, condition expressions |
| `redis-atomic.test.ts` | WATCH/MULTI/EXEC, race condition handling |

### Running Tests

```bash
# All tests
npm test

# Property-based tests only
npx vitest run src/__tests__/properties/

# Specific test suite
npx vitest run src/__tests__/properties/wallet.property.test.ts

# With coverage
npx vitest run --coverage
```

---

## DynamoDB Single-Table Design

### Entity Key Patterns

| Entity | PK | SK |
|--------|----|----|
| Station | `STATION#{stationId}` | `METADATA` |
| Battery | `STATION#{stationId}` | `BATTERY#{batteryId}` |
| Reservation | `RESERVATION#{reservationId}` | `METADATA` |
| User (Driver/Operator/Fleet) | `USER#{userId}` | `PROFILE` |
| Swap Transaction | `STATION#{stationId}` | `SWAP#{timestamp}#{txId}` |
| Notification | `USER#{userId}` | `NOTIF#{timestamp}#{notifId}` |
| Fleet Vehicle | `FLEET#{fleetId}` | `VEHICLE#{vehicleId}` |
| Alert | `STATION#{stationId}` | `ALERT#{timestamp}#{alertId}` |

### Global Secondary Indexes

| GSI | PK | SK | Purpose |
|-----|----|----|---------|
| GSI1-DriverReservations | `USER#{userId}` | `RESERVATION#{state}#{createdAt}` | Driver's reservations by state |
| GSI2-StationReservations | `STATION#{stationId}` | `RESV_STATE#{state}#{createdAt}` | Station's reservation queue |
| GSI3-PhoneLookup | `PHONE#{phone}` | `USER#{userId}` | Find user by phone (auth) |
| GSI4-ReceiptLookup | `RECEIPT#{receiptId}` | `SWAP#{txId}` | Receipt lookup |
| GSI5-FleetDrivers | `FLEET#{fleetId}` | `DRIVER#{userId}` | Fleet's driver list |

### Wallet Ledger Table (Separate - Append-Only)

| PK | SK | Purpose |
|----|----|---------|
| `WALLET#{userId}` | `ENTRY#{timestamp}#{entryId}` | Financial audit trail |

---

## Redis Key Patterns

| Key Pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `station:{id}:available` | String (int) | - | Real-time available battery count |
| `station:{id}:detail` | Hash | 60s | Cached station detail |
| `station:{id}:lock` | String | 5s | Distributed lock for reservation |
| `reservation:{id}:expiry` | String | 15min | Reservation expiry tracking |
| `user:{id}:session` | Hash | 24h | Session data + rate limiting |
| `otp:{phone}` | String | 300s | OTP code |
| `otp:{phone}:attempts` | String (int) | 900s | Failed OTP attempt counter |
| `ws:connections:{userId}` | Set | - | WebSocket connection IDs |

---

## Security

### Authorization Flow

1. **API Gateway** receives request with `Authorization: Bearer <JWT>` header
2. **Lambda Authorizer** validates JWT signature against Cognito JWKS
3. **Role extraction** from Cognito groups claim (`Drivers`, `Operators`, `FleetManagers`)
4. **Resource authorization** - service-level check that user owns the resource

### Input Validation

All endpoints use Zod schemas for request validation:

```typescript
import { z } from 'zod';

const createReservationSchema = z.object({
  stationId: z.string().uuid(),
  batteryType: z.enum(['48V', '60V', '72V']).optional(),
});
```

### Audit Logging

Every state-changing operation is logged to an immutable audit trail:

```typescript
await audit.log({
  event: 'SWAP_COMPLETE',
  userId: context.userId,
  stationId,
  amount,
  receiptId,
  timestamp: new Date().toISOString(),
});
```

### Data Masking

Sensitive data is masked in logs and error responses:

```typescript
mask.phone('+2348131234567') // to '+234 8** *** **67'
```

---

## Deployment

### Deploy with SAM

```bash
cd infrastructure

# Build
sam build

# Deploy (first time - guided)
sam deploy --guided

# Deploy (subsequent - uses samconfig.toml)
sam deploy
```

### Environment-Specific Deployment

```bash
# Development
sam deploy --parameter-overrides Environment=dev APNPartnerId=YOUR_ID

# Production
sam deploy --parameter-overrides Environment=prod APNPartnerId=YOUR_ID \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-dynamodb` | ^3.600 | DynamoDB operations |
| `@aws-sdk/lib-dynamodb` | ^3.600 | DynamoDB document client |
| `@aws-sdk/client-cognito-identity-provider` | ^3.600 | Cognito admin operations |
| `@aws-sdk/client-eventbridge` | ^3.1057 | Event publishing |
| `@aws-sdk/client-sns` | ^3.600 | Push/SMS notifications |
| `ioredis` | ^5.4 | Redis client |
| `zod` | ^3.23 | Schema validation |
| `uuid` | ^10.0 | UUID generation |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^1.6 | Test runner |
| `fast-check` | ^3.19 | Property-based testing |
| `typescript` | ^5.5 | Type checking |
| `@types/aws-lambda` | ^8.10 | Lambda type definitions |

---

<p align="center">
  <em>SwapSmart Backend - Built for the ONE WITH AI Hackathon by Arthurite Integrated</em>
</p>
