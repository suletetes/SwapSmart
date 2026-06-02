# SwapSmart Infrastructure - AWS SAM Template

<p align="center">
  <img src="https://img.shields.io/badge/AWS-SAM-FF9900?style=flat-square&logo=amazonaws" alt="AWS SAM" />
  <img src="https://img.shields.io/badge/Region-af--south--1-232F3E?style=flat-square" alt="af-south-1" />
  <img src="https://img.shields.io/badge/IaC-CloudFormation-E7157B?style=flat-square" alt="CloudFormation" />
  <img src="https://img.shields.io/badge/Runtime-Node.js%2020%20(ARM64)-339933?style=flat-square" alt="Node.js 20" />
</p>

Complete serverless infrastructure for the SwapSmart platform, defined as Infrastructure as Code using AWS SAM (Serverless Application Model). Deploys 20+ AWS resources across data, compute, networking, security, monitoring, and location services.

---

## AWS Services Provisioned

| Category | Service | Resource | Description |
|----------|---------|----------|-------------|
| **Data** | DynamoDB | `SwapSmart-{env}` | Primary single-table (PAY_PER_REQUEST, 5 GSIs, PITR, SSE) |
| **Data** | DynamoDB | `SwapSmart_Ledger-{env}` | Append-only financial ledger (deletion protected) |
| **Data** | ElastiCache | `swapsmart-redis-{env}` | Redis 7.1 (cache.t4g.micro, TLS, encryption at rest) |
| **Compute** | Lambda | 9 service functions | Node.js 20, ARM64, 256MB, 30s timeout |
| **Compute** | Lambda | 3 Cognito triggers | Custom auth challenge flow |
| **Compute** | Lambda | 1 scheduled function | Reservation expiry checker |
| **API** | API Gateway | REST API | `/v1/*` endpoints with CORS |
| **API** | API Gateway v2 | WebSocket API | Real-time updates (`$connect`, `$disconnect`, `$default`) |
| **Auth** | Cognito | User Pool + Client | Phone-based OTP, 3 role groups |
| **Security** | WAF v2 | WebACL | 5 rules (rate limit, geo, SQLi, XSS, size) |
| **Security** | VPC | 10.0.0.0/16 | Private subnets for Redis isolation |
| **Security** | Security Groups | Lambda SG + Redis SG | Least-privilege network access |
| **Events** | EventBridge | Event Bus | `swapsmart-events-{env}` |
| **Events** | EventBridge | Scheduled Rule | Reservation expiry (every 1 min) |
| **Events** | SQS | Dead Letter Queue | Failed event delivery (14-day retention) |
| **CDN** | CloudFront | Distribution | S3 origin, OAC, TLS 1.2, HTTP/2, SPA routing |
| **Storage** | S3 | Assets Bucket | Versioned, SSE-AES256, public access blocked |
| **IoT** | IoT Core | Thing Type | `SwapStation` device type |
| **IoT** | IoT Core | Topic Rule | Battery state to EventBridge routing |
| **Monitoring** | CloudWatch | Dashboard | Lambda metrics, API latency, DynamoDB capacity |
| **Monitoring** | SNS | Alarm Topic | Alarm notification delivery |

---

## SAM Template Structure

```yaml
template.yaml
├── Parameters
│   ├── Environment (dev | staging | prod)
│   └── APNPartnerId (Arthurite AWS Partner ID)
├── Globals
│   └── Function defaults (Node.js 20, ARM64, 256MB, 30s, env vars, tags)
└── Resources
    ├── Data Layer
    │   ├── SwapSmartTable (DynamoDB - primary)
    │   ├── SwapSmartLedgerTable (DynamoDB - ledger)
    │   └── SwapSmartRedisCluster (ElastiCache)
    ├── Auth
    │   ├── SwapSmartUserPool (Cognito)
    │   ├── SwapSmartUserPoolClient
    │   ├── DriversGroup / OperatorsGroup / FleetManagersGroup
    │   └── Cognito Lambda Triggers (Define/Create/Verify)
    ├── API
    │   ├── SwapSmartApi (REST)
    │   ├── SwapSmartWebSocketApi
    │   └── WebSocket Routes + Stage
    ├── Security
    │   ├── SwapSmartWAF (WebACL + 5 rules)
    │   ├── SwapSmartVPC
    │   ├── PrivateSubnet1 / PrivateSubnet2
    │   ├── LambdaSecurityGroup
    │   └── RedisSecurityGroup
    ├── Events
    │   ├── SwapSmartEventBus
    │   ├── EventBridgeDLQ (SQS)
    │   ├── ReservationExpiryRule
    │   └── ReservationExpiryFn
    ├── CDN & Storage
    │   ├── SwapSmartAssetsBucket (S3)
    │   ├── SwapSmartOAC (Origin Access Control)
    │   └── SwapSmartDistribution (CloudFront)
    ├── IoT
    │   ├── SwapStationThingType
    │   ├── BatteryStateIoTRule
    │   └── IoTEventBridgeRole
    └── Monitoring
        ├── SwapSmartAlarmTopic (SNS)
        └── SwapSmartDashboard (CloudWatch)
```

---

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Environment` | String | `dev` | Deployment environment (`dev`, `staging`, `prod`) |
| `APNPartnerId` | String | *(required)* | Arthurite AWS APN Partner ID for hackathon tagging |

All resources are tagged with:
```yaml
Tags:
  APN-Partner-ID: !Ref APNPartnerId
  Project: SwapSmart
  Environment: !Ref Environment
```

---

## Resources by Category

### Data Layer

#### DynamoDB Primary Table (`SwapSmart-{env}`)

| Property | Value |
|----------|-------|
| Billing Mode | PAY_PER_REQUEST (on-demand) |
| Encryption | SSE enabled (AWS-managed KMS) |
| Point-in-Time Recovery | Enabled |
| TTL | Enabled (`ttl` attribute) |
| GSIs | 5 (DriverReservations, StationReservations, PhoneLookup, ReceiptLookup, FleetDrivers) |

#### DynamoDB Ledger Table (`SwapSmart_Ledger-{env}`)

| Property | Value |
|----------|-------|
| Billing Mode | PAY_PER_REQUEST |
| Deletion Protection | **Enabled** (append-only financial audit) |
| Point-in-Time Recovery | Enabled |
| Encryption | SSE enabled |

#### ElastiCache Redis

| Property | Value |
|----------|-------|
| Engine | Redis 7.1 |
| Node Type | cache.t4g.micro (ARM64, cost-optimized) |
| Nodes | 1 (single-node for MVP) |
| Transit Encryption | Enabled (TLS) |
| At-Rest Encryption | Enabled |
| Network | Private subnets only |

### Compute Layer

#### Lambda Function Defaults (Globals)

| Property | Value |
|----------|-------|
| Runtime | nodejs20.x |
| Architecture | arm64 (Graviton2 - 20% cheaper) |
| Memory | 256 MB |
| Timeout | 30 seconds |
| Environment | `ENVIRONMENT`, `TABLE_NAME`, `LEDGER_TABLE_NAME` |

### Networking & Security

#### VPC Configuration

| Resource | CIDR / Config |
|----------|---------------|
| VPC | 10.0.0.0/16 |
| Private Subnet 1 | 10.0.1.0/24 (AZ-a) |
| Private Subnet 2 | 10.0.2.0/24 (AZ-b) |
| Lambda SG | Outbound only |
| Redis SG | Inbound TCP 6379 from Lambda SG only |

#### WAF Rules

| Priority | Rule | Action | Config |
|----------|------|--------|--------|
| 1 | Rate Limit | Block | 2000 req / 5 min per IP |
| 2 | Geo Restriction | Block non-allowed | Allow: NG, GH, KE, ZA only |
| 3 | AWS Common Rules | Managed | XSS, path traversal, etc. |
| 4 | SQL Injection | Managed | AWS SQLi rule set |
| 5 | Size Restriction | Block | Body > 10KB |

### CDN & Storage

#### CloudFront Distribution

| Property | Value |
|----------|-------|
| Origin | S3 (via OAC - no public bucket access) |
| Protocol | HTTPS only (redirect HTTP) |
| TLS | TLSv1.2_2021 minimum |
| HTTP Version | HTTP/2 |
| Price Class | PriceClass_100 (cheapest edges) |
| Compression | Enabled (Gzip + Brotli) |
| SPA Routing | 403/404 to /index.html |

#### S3 Bucket

| Property | Value |
|----------|-------|
| Versioning | Enabled |
| Encryption | AES-256 (SSE-S3) |
| Public Access | **All blocked** |
| Access | CloudFront OAC only |

### IoT

| Resource | Description |
|----------|-------------|
| Thing Type | `SwapStation` - searchable by stationId, region, status |
| Topic Rule | `swapsmart/+/battery/state` to EventBridge |
| Error Action | Failed messages to SQS DLQ |

### Monitoring

#### CloudWatch Dashboard Widgets

| Widget | Metric | Stat |
|--------|--------|------|
| Lambda Invocations & Errors | Invocations, Errors | Sum (5min) |
| API Gateway Latency | Latency | p95 (5min) |
| DynamoDB Capacity | Read/Write units | Sum (5min) |
| Redis Connections | CurrConnections | Average |
| WAF Blocked Requests | BlockedRequests | Sum |

#### SNS Alarm Topic

Receives notifications from CloudWatch alarms for:
- Lambda error rate > 5%
- API Gateway 5xx > 10/min
- DynamoDB throttled requests
- Redis evictions

---

## Deployment

### Prerequisites

- AWS CLI v2 configured (`aws configure`)
- AWS SAM CLI v1.100+ (`sam --version`)
- Arthurite APN Partner ID

### First-Time Deployment (Guided)

```bash
cd infrastructure

# Build the SAM application
sam build

# Deploy with interactive prompts
sam deploy --guided
```

The guided deployment will ask for:
- Stack name (e.g., `swapsmart-dev`)
- Region (`af-south-1`)
- Parameter values (Environment, APNPartnerId)
- IAM capability confirmation

### Subsequent Deployments

```bash
# Uses saved config from samconfig.toml
sam build && sam deploy
```

### Environment-Specific Deployment

```bash
# Development
sam deploy --stack-name swapsmart-dev \
  --parameter-overrides Environment=dev APNPartnerId=YOUR_APN_ID \
  --region af-south-1

# Production
sam deploy --stack-name swapsmart-prod \
  --parameter-overrides Environment=prod APNPartnerId=YOUR_APN_ID \
  --region af-south-1 \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

### Validate Template

```bash
sam validate --lint
```

### Delete Stack

```bash
sam delete --stack-name swapsmart-dev --region af-south-1
```

---

## Stack Outputs

| Output | Description | Example Value |
|--------|-------------|---------------|
| `SwapSmartTableName` | DynamoDB primary table name | `SwapSmart-dev` |
| `SwapSmartLedgerTableName` | DynamoDB ledger table name | `SwapSmart_Ledger-dev` |
| `UserPoolId` | Cognito User Pool ID | `af-south-1_AbCdEfGhI` |
| `UserPoolClientId` | Cognito App Client ID | `1a2b3c4d5e6f7g8h9i0j` |
| `RestApiUrl` | API Gateway REST endpoint | `https://abc123.execute-api.af-south-1.amazonaws.com/dev` |
| `WebSocketUrl` | WebSocket API endpoint | `wss://xyz789.execute-api.af-south-1.amazonaws.com/dev` |
| `CloudFrontDomain` | CloudFront distribution domain | `d1234567890.cloudfront.net` |
| `AssetsBucketName` | S3 bucket for frontend assets | `swapsmart-assets-dev-123456789012` |
| `RedisEndpoint` | ElastiCache Redis endpoint | `swapsmart-redis-dev.abc123.0001.afs1.cache.amazonaws.com` |
| `EventBusName` | EventBridge bus name | `swapsmart-events-dev` |
| `AlarmTopicArn` | SNS alarm topic ARN | `arn:aws:sns:af-south-1:123456789012:swapsmart-alarms-dev` |
| `WAFWebACLArn` | WAF WebACL ARN | `arn:aws:wafv2:af-south-1:...` |

---

## Cost Estimation

### MVP / Demo (~$25-50/month)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| DynamoDB | $2-5 | PAY_PER_REQUEST, minimal traffic |
| Lambda | $0-1 | Free tier covers 1M requests |
| API Gateway | $1-3 | $3.50/million requests |
| ElastiCache | $12-15 | cache.t4g.micro (smallest) |
| CloudFront | $1-2 | PriceClass_100, minimal traffic |
| S3 | $0.50 | Static assets only |
| IoT Core | $1-2 | Minimal device connections |
| CloudWatch | $2-5 | Logs + dashboard |
| WAF | $5-6 | $5/WebACL + $1/rule |
| **Total** | **~$25-50** | |

### Growth (5,000 drivers, 100 stations): ~$200-400/month

### Scale (50,000 drivers, 1,000 stations): ~$1,500-3,000/month

---

## Monitoring

### CloudWatch Dashboard

Access at: `https://af-south-1.console.aws.amazon.com/cloudwatch/home?region=af-south-1#dashboards:name=SwapSmart-{env}`

### Key Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| Lambda Errors | > 5% error rate | Investigate function logs |
| API Gateway 5xx | > 10/min | Check Lambda cold starts, timeouts |
| DynamoDB Throttles | > 0 | Review access patterns |
| Redis Evictions | > 0 | Increase node size |
| WAF Blocked | Spike | Review blocked IPs/patterns |

### Audit Logging

- **CloudTrail** - All API calls logged
- **DynamoDB Streams** - Change data capture (optional)
- **Application Audit** - Custom audit table in DynamoDB

---

## Security

### Encryption

| Layer | Method |
|-------|--------|
| DynamoDB at rest | AES-256 (AWS-managed KMS) |
| S3 at rest | SSE-S3 (AES-256) |
| Redis at rest | AES-256 (ElastiCache-managed) |
| Redis in transit | TLS 1.2 |
| API Gateway | TLS 1.2 (enforced) |
| CloudFront | TLS 1.2_2021 minimum |

### Network Security

- Redis is **only accessible from within the VPC** (private subnets)
- Lambda functions connect to Redis via VPC configuration
- Security groups enforce least-privilege (Redis SG only allows Lambda SG on port 6379)
- No public IP addresses on any compute resources

### WAF Protection

- **Rate limiting** prevents DDoS and brute force
- **Geo-blocking** restricts to target markets (Nigeria, Ghana, Kenya, South Africa)
- **SQL injection** and **XSS** prevention via AWS managed rules
- **Size restriction** prevents payload abuse (10KB max body)

### IAM Least Privilege

Each Lambda function has its own execution role scoped to:
- Specific DynamoDB table + actions (e.g., `dynamodb:GetItem` on `SwapSmart-{env}`)
- Specific EventBridge bus for publishing
- Specific SNS topic for notifications
- No wildcard (`*`) resource permissions

---

## Region Selection: af-south-1 (Cape Town)

### Why Cape Town?

| Factor | af-south-1 | eu-west-1 (Ireland) | us-east-1 |
|--------|-----------|---------------------|------------|
| Latency to Lagos | ~30ms | ~150ms | ~200ms |
| Data residency | Africa | Europe | US |
| Service availability | Good (all needed services) | Full | Full |
| Cost | Standard | Standard | Standard |

**Decision**: `af-south-1` provides the lowest latency for Nigerian users (~30ms vs ~150ms for European regions). All required services (DynamoDB, Lambda, API Gateway, ElastiCache, CloudFront, IoT Core, Cognito, EventBridge, WAF, S3) are available in this region.

### Considerations

- CloudFront edge locations include Lagos, so static content is served locally regardless of origin region
- IoT Core in af-south-1 minimizes MQTT connection latency for station sensors
- Cognito in af-south-1 reduces auth latency for OTP verification

---

## Tagging Strategy

All resources are tagged for:
- **Cost allocation** - Track spending per environment
- **Hackathon compliance** - APN Partner ID required for shortlisting
- **Resource management** - Filter by project in AWS Console

```yaml
Tags:
  APN-Partner-ID: <Arthurite Partner ID>
  Project: SwapSmart
  Environment: dev | staging | prod
```

---

<p align="center">
  <em>SwapSmart Infrastructure - Built for the ONE WITH AI Hackathon by Arthurite Integrated</em>
</p>
