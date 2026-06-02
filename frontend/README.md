# SwapSmart Frontend - Next.js 14 PWA

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/MapLibre-GL%20JS-396CB2?style=flat-square" alt="MapLibre" />
</p>

A **Progressive Web App** built with Next.js 14 (App Router) serving three role-based applications: Driver PWA, Operator Dashboard, and Fleet Portal. Designed mobile-first for Nigerian users on 3G networks with offline support.

---

## Features

###  Driver PWA (Mobile-First)

- Interactive map with real-time station markers and availability
- One-tap battery reservation with countdown timer
- Turn-by-turn navigation to station (Amazon Location routing)
- In-app wallet with Paystack top-up
- Swap history with receipts and ratings
- AI chat assistant for route recommendations
- Push notifications for reservation updates
- Installable (Add to Home Screen)
- Works offline with cached station data

###  Operator Dashboard (Tablet/Desktop)

- Live battery inventory grid (charged / charging / depleted / maintenance)
- Reservation queue with driver ETA and swap codes
- AI demand forecast chart (next 2-4 hours)
- Revenue analytics with daily/weekly/monthly views
- Low-stock and maintenance alerts
- Station settings management

###  Fleet Portal (Desktop)

- Fleet-wide vehicle map with battery status indicators
- Predictive maintenance alerts and health scores
- Cost analysis: fuel savings vs swap costs (charts)
- Driver assignment and performance tracking
- Telemetry history with time-series graphs
- CSV/PDF report export

---

## Design System

### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary` | `#10B981` | `#34D399` | Actions, CTAs, success states |
| `--color-secondary` | `#3B82F6` | `#60A5FA` | Links, info states |
| `--color-warning` | `#F59E0B` | `#FBBF24` | Low battery, alerts |
| `--color-danger` | `#EF4444` | `#F87171` | Errors, critical alerts |
| `--color-surface` | `#FFFFFF` | `#1F2937` | Card backgrounds |
| `--color-background` | `#F9FAFB` | `#111827` | Page background |
| `--color-text` | `#111827` | `#F9FAFB` | Primary text |

### Typography

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `heading-1` | 2rem / 32px | 700 | Page titles |
| `heading-2` | 1.5rem / 24px | 600 | Section headers |
| `heading-3` | 1.25rem / 20px | 600 | Card titles |
| `body` | 1rem / 16px | 400 | Body text |
| `caption` | 0.875rem / 14px | 400 | Labels, metadata |
| `small` | 0.75rem / 12px | 400 | Badges, timestamps |

### Spacing Scale

`4px` to `8px` to `12px` to `16px` to `24px` to `32px` to `48px` to `64px`

### Component Library

| Component | Description |
|-----------|-------------|
| `Button` | Primary, secondary, ghost, danger variants; loading state |
| `Card` | Surface container with optional header, footer |
| `Badge` | Status indicators (available, charging, reserved, maintenance) |
| `StatusBadge` | Battery/reservation state with color coding |
| `MapView` | MapLibre GL wrapper with station markers |
| `StationCard` | Station info with availability, distance, price |
| `ReservationTimer` | Countdown timer with progress ring |
| `WalletBalance` | Balance display with top-up CTA |
| `BatteryLevel` | Visual battery indicator (0-100%) |
| `NotificationToast` | Push notification display |
| `BottomSheet` | Mobile bottom sheet for actions |
| `Skeleton` | Loading placeholder animations |

---

## Directory Structure

```
frontend/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── .env.example              # Environment variable template
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (generated)
│   ├── icons/                # PWA icons (192x192, 512x512)
│   └── assets/               # Static images
└── src/
    ├── app/                  # Next.js App Router
    │   ├── layout.tsx        # Root layout (providers, fonts)
    │   ├── page.tsx          # Landing / role selection
    │   ├── globals.css       # Tailwind imports + CSS variables
    │   ├── (public)/         # Public routes (login, register)
    │   ├── (driver)/         # Driver route group
    │   │   ├── map/          # Station map view
    │   │   ├── reserve/      # Reservation flow
    │   │   ├── wallet/       # Wallet & transactions
    │   │   ├── history/      # Swap history
    │   │   ├── chat/         # AI assistant
    │   │   └── profile/      # Driver profile
    │   ├── (operator)/       # Operator route group
    │   │   ├── dashboard/    # Overview metrics
    │   │   ├── inventory/    # Battery management
    │   │   ├── queue/        # Reservation queue
    │   │   ├── analytics/    # Revenue charts
    │   │   ├── alerts/       # Alert management
    │   │   └── settings/     # Station settings
    │   └── (fleet)/          # Fleet manager route group
    │       ├── overview/     # Fleet dashboard
    │       ├── vehicles/     # Vehicle list & detail
    │       ├── drivers/      # Driver management
    │       ├── costs/        # Cost analysis
    │       ├── maintenance/  # Health & maintenance
    │       └── reports/      # Report generation
    ├── components/
    │   ├── ui/               # Design system components
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── Skeleton.tsx
    │   │   ├── BottomSheet.tsx
    │   │   └── ...
    │   └── driver/           # Driver-specific components
    │       ├── MapView.tsx
    │       ├── StationCard.tsx
    │       ├── ReservationTimer.tsx
    │       ├── WalletBalance.tsx
    │       └── BatteryLevel.tsx
    ├── hooks/                # Custom React hooks
    │   ├── useStations.ts    # Station data fetching + caching
    │   ├── useReservation.ts # Reservation lifecycle management
    │   └── useWebSocket.ts   # WebSocket connection + reconnection
    ├── stores/               # Zustand state stores
    │   ├── auth.store.ts     # Auth state, tokens, user profile
    │   ├── theme.store.ts    # Theme preference (light/dark/system)
    │   └── offline.store.ts  # Offline queue, sync status
    ├── lib/                  # Utility libraries
    │   ├── api.ts            # Fetch wrapper with auth headers
    │   ├── websocket.ts      # WebSocket client with reconnection
    │   ├── design-tokens.ts  # CSS variable definitions
    │   ├── query-client.ts   # TanStack Query configuration
    │   └── auth/             # Auth utilities (token refresh, etc.)
    ├── providers/            # React context providers
    │   ├── QueryProvider.tsx  # TanStack Query provider
    │   └── ThemeProvider.tsx  # Theme context + system detection
    └── __tests__/
        └── e2e/              # End-to-end tests (Playwright)
```

---

## Pages & Routes

### Public Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Role selection (Driver / Operator / Fleet) |
| `/login` | Login | Phone number + OTP verification |
| `/register` | Register | Account creation |

### Driver Routes (`/(driver)`)

| Route | Page | Description |
|-------|------|-------------|
| `/map` | Station Map | Interactive map with nearby stations |
| `/reserve` | Reservation | Reservation flow + countdown |
| `/wallet` | Wallet | Balance, top-up, transaction history |
| `/history` | Swap History | Past swaps with receipts |
| `/chat` | AI Assistant | Bedrock-powered chat |
| `/profile` | Profile | Driver info, settings |

### Operator Routes (`/(operator)`)

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Key metrics overview |
| `/inventory` | Inventory | Battery grid management |
| `/queue` | Queue | Active reservations |
| `/analytics` | Analytics | Revenue & performance charts |
| `/alerts` | Alerts | Active alerts list |
| `/settings` | Settings | Station configuration |

### Fleet Routes (`/(fleet)`)

| Route | Page | Description |
|-------|------|-------------|
| `/overview` | Overview | Fleet-wide metrics |
| `/vehicles` | Vehicles | Vehicle list + map |
| `/vehicles/[id]` | Vehicle Detail | Individual vehicle telemetry |
| `/drivers` | Drivers | Driver management |
| `/costs` | Cost Analysis | Fuel vs swap comparison |
| `/maintenance` | Maintenance | Health scores + alerts |
| `/reports` | Reports | Export generation |

---

## Shared Components

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `ui/Button.tsx` | Multi-variant button with loading spinner |
| `Card` | `ui/Card.tsx` | Elevated surface container |
| `Badge` | `ui/Badge.tsx` | Colored label for status display |
| `StatusBadge` | `ui/StatusBadge.tsx` | Battery/reservation state indicator |
| `Skeleton` | `ui/Skeleton.tsx` | Content loading placeholder |
| `BottomSheet` | `ui/BottomSheet.tsx` | Mobile slide-up panel |
| `MapView` | `driver/MapView.tsx` | MapLibre GL map with markers |
| `StationCard` | `driver/StationCard.tsx` | Station info card (availability, price, distance) |
| `ReservationTimer` | `driver/ReservationTimer.tsx` | Circular countdown timer |
| `WalletBalance` | `driver/WalletBalance.tsx` | Balance display with actions |
| `BatteryLevel` | `driver/BatteryLevel.tsx` | Visual battery percentage indicator |

---

## State Management

### Zustand Stores

#### `auth.store.ts`

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: Tokens, user: User) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}
```

#### `theme.store.ts`

```typescript
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}
```

#### `offline.store.ts`

```typescript
interface OfflineState {
  isOnline: boolean;
  pendingActions: QueuedAction[];
  lastSyncAt: string | null;
  enqueue: (action: QueuedAction) => void;
  sync: () => Promise<void>;
}
```

### Server State (TanStack Query)

All server data is managed via TanStack React Query with:
- Automatic background refetching
- Stale-while-revalidate caching
- Optimistic updates for reservations
- Offline persistence via `persistQueryClient`

---

## Real-Time Updates

### WebSocket Client

The app maintains a persistent WebSocket connection to API Gateway for real-time updates:

```typescript
// lib/websocket.ts
class SwapSmartWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Exponential backoff

  connect(url: string, token: string): void;
  subscribe(channel: string, handler: MessageHandler): void;
  disconnect(): void;
}
```

**Features:**
- Automatic reconnection with exponential backoff (1s to 2s to 4s to ... to 30s max)
- Token refresh on 401 disconnect
- Message queuing during reconnection
- Heartbeat ping/pong (30s interval)
- Channel-based subscription model

### Subscribed Channels

| Role | Channels |
|------|----------|
| Driver | `station/{id}/availability`, `reservation/{id}/status`, `user/{id}/notifications` |
| Operator | `station/{id}/availability`, `station/{id}/reservations`, `user/{id}/notifications` |
| Fleet | `fleet/{id}/telemetry`, `user/{id}/notifications` |

---

## PWA & Offline Support

### Service Worker Strategies

| Resource | Strategy | Description |
|----------|----------|-------------|
| Static assets (JS, CSS, images) | Cache First | Serve from cache, update in background |
| API responses (stations) | Stale While Revalidate | Serve cached, fetch fresh in background |
| API mutations (reserve, swap) | Network First | Try network, queue if offline |
| Map tiles | Cache First | Cache tiles for offline map viewing |
| Fonts | Cache First | Cache Google Fonts for offline |

### Offline Capabilities

- **Station data** - Cached for offline viewing (last known availability)
- **Map tiles** - Pre-cached for the user's area
- **Action queue** - Mutations queued and replayed when back online
- **Sync indicator** - Visual indicator showing online/offline status
- **Background sync** - Service worker syncs queued actions when connectivity returns

### PWA Manifest

```json
{
  "name": "SwapSmart",
  "short_name": "SwapSmart",
  "description": "Find and reserve battery swaps instantly",
  "start_url": "/map",
  "display": "standalone",
  "theme_color": "#10B981",
  "background_color": "#111827",
  "icons": [...]
}
```

---

## Accessibility

SwapSmart targets **WCAG 2.1 AA** compliance:

| Requirement | Implementation |
|-------------|---------------|
| **Touch targets** | Minimum 44×44px for all interactive elements |
| **Color contrast** | 4.5:1 minimum for text, 3:1 for large text |
| **Color-blind safe** | Never rely on color alone; use icons + text labels |
| **Reduced motion** | Respect `prefers-reduced-motion`; disable animations |
| **Screen reader** | Semantic HTML, ARIA labels, live regions for updates |
| **Keyboard navigation** | Full keyboard support, visible focus indicators |
| **Font scaling** | rem-based sizing, supports up to 200% zoom |
| **RTL support** | Logical properties (`margin-inline-start`) |

### Accessibility Testing

```bash
# Lighthouse accessibility audit
npx lighthouse http://localhost:3000 --only-categories=accessibility

# axe-core integration in tests
npm run test:a11y
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values from your SAM stack outputs:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API Gateway REST endpoint |
| `NEXT_PUBLIC_WS_URL` | WebSocket API endpoint |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `NEXT_PUBLIC_MAP_NAME` | Amazon Location map resource |
| `NEXT_PUBLIC_PLACE_INDEX_NAME` | Amazon Location place index |
| `NEXT_PUBLIC_ROUTE_CALCULATOR_NAME` | Amazon Location route calculator |
| `S3_BUCKET` | S3 bucket for deployment |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |

---

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your AWS stack outputs

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |

### Code Quality

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Format (if prettier configured)
npx prettier --write src/
```

---

## Deployment

### Using deploy script

```bash
# Build and deploy to S3 + CloudFront
./scripts/deploy.sh

# Or manually:
npm run build
aws s3 sync out/ s3://$S3_BUCKET --delete
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

### Build Output

Next.js static export is deployed to S3 and served via CloudFront with:
- Gzip/Brotli compression
- Cache headers (immutable for hashed assets)
- SPA fallback (404 to index.html)
- TLS 1.2+ enforcement
- HTTP/2 enabled

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^14.2 | React framework (App Router) |
| `react` | ^18.3 | UI library |
| `tailwindcss` | ^3.4 | Utility-first CSS |
| `@tanstack/react-query` | ^5.50 | Server state management |
| `zustand` | ^4.5 | Client state management |
| `maplibre-gl` | ^4.5 | Map rendering (vector tiles) |
| `recharts` | ^2.12 | Charts and data visualization |
| `framer-motion` | ^11.3 | Animations (motion-safe) |
| `react-hook-form` | ^7.52 | Form management |
| `zod` | ^3.23 | Schema validation |
| `@hookform/resolvers` | ^3.9 | Zod + React Hook Form bridge |
| `next-intl` | ^3.17 | Internationalization |
| `@ducanh2912/next-pwa` | ^10.2 | PWA/service worker support |

---

<p align="center">
  <em>SwapSmart Frontend - Built for the ONE WITH AI Hackathon by Arthurite Integrated</em>
</p>
