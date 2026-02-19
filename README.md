# Referral Justo — Two-Sided Referral System

A referral system for the Justo restaurant platform. An existing user invites a new restaurant with a unique code. When the restaurant qualifies, both parties receive rewards.

## Stack

- **Express** + TypeScript
- **PostgreSQL** + Prisma ORM
- **BullMQ** + Redis (async reward emission)
- **JWT** authentication
- **Zod** validation
- **Jest** + Supertest

## Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

## Setup

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, REDIS_URL, JWT_SECRET

# Create database and run migrations
npx prisma migrate dev

# Seed test data
npx prisma db seed

# Start API server
npm run dev

# Start reward worker (separate terminal)
npm run worker:dev
```

## API Endpoints

### Auth (public)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login, get JWT |

### Referrals (JWT required unless noted)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/referrals/my-code` | JWT | Get or create own referral code |
| GET | `/referrals/validate/:code` | Public | Validate code |
| POST | `/referrals/:id/qualify` | Admin | Mark referral as qualified |
| GET | `/referrals/sent` | JWT | Referrals I sent |
| GET | `/referrals/received` | JWT | My incoming referral |

### Restaurants
| Method | Path | Description |
|--------|------|-------------|
| POST | `/restaurants/register` | Register restaurant (optional `referralCode`) |

### Rewards
| Method | Path | Description |
|--------|------|-------------|
| GET | `/rewards` | My rewards |
| POST | `/rewards/:id/redeem` | Redeem a reward |

## Flow

```
1. User registers → POST /auth/register
2. User gets referral code → GET /referrals/my-code
3. Shares code with restaurant owner
4. Restaurant owner registers → POST /auth/register
5. Registers restaurant with code → POST /restaurants/register { referralCode }
6. Admin qualifies referral → POST /referrals/:id/qualify
7. Worker emits rewards (async via BullMQ)
8. Both parties see rewards → GET /rewards
9. Each redeems → POST /rewards/:id/redeem
```

## Configuration

All referral/reward behavior is configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REFERRAL_CODE_PREFIX` | JUSTO | Code prefix |
| `REFERRAL_CODE_LENGTH` | 8 | Random part length |
| `REFERRAL_QUALIFY_EVENT` | first_order | Qualification trigger |
| `REFERRAL_REWARD_REFERRER_TYPE` | credits | Referrer reward type |
| `REFERRAL_REWARD_REFERRER_AMOUNT` | 500 | Referrer reward amount |
| `REFERRAL_REWARD_REFERRED_TYPE` | fee_waiver | Referred reward type |
| `REFERRAL_REWARD_REFERRED_DESCRIPTION` | 30 dias sin comision | Referred reward description |
| `REFERRAL_REWARD_EXPIRES_DAYS` | 90 | Days until reward expires |

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## Project Structure

```
src/
  app.ts                    # Express app
  server.ts                 # Server entry point
  config/                   # Config, Prisma, Redis, Queue
  middleware/                # Auth, validation, error handling
  modules/
    auth/                   # Registration/login
    referral/               # Code generation, qualification
    restaurant/             # Restaurant registration
    reward/                 # Reward emission/redemption
  workers/reward.worker.ts  # BullMQ worker (runs separately)
  jobs/                     # Job definitions
  utils/                    # Code generator, errors, logger
prisma/
  schema.prisma             # Database schema
  seed.ts                   # Test data
tests/
  unit/                     # Unit tests
  integration/              # API integration tests
```

## Seed Data

The seed script creates:
- **admin@justo.mx** (admin, password: `admin123`)
- **alice@example.com** (referrer, password: `password123`)
- **bob@example.com** (referred restaurant owner, password: `password123`)
- **carol@example.com** (fresh user, password: `password123`)
- Referral code: `JUSTO-ALICE1`
- Restaurant: "Tacos El Bob" with a PENDING referral
