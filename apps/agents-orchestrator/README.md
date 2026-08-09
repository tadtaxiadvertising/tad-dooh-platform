# TAD Autonomous Agents Orchestrator

Autonomous AI agents for operational automation (Systems, Marketing, Finance, HR) running 24/7 on Easypanel.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                        │
│  (Supervisor-Worker Pattern - Single Process, Multi-Agent)  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Systems      │     │  Marketing    │     │  Finance      │
│  Agent        │     │  Agent        │     │  Agent        │
│  (Read-only)  │     │  (Read-only)  │     │  (API Mutate) │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ @tad/logging  │     │ @tad/database │     │ Internal API  │
│ Error Analysis│     │ Campaign Data │     │ (Idempotent)  │
└───────────────┘     └───────────────┘     └───────────────┘
                                                        │
                                               ┌───────────────┐
                                               │    HR Agent   │
                                               │  (Read-only)  │
                                               └───────────────┘
```

## Critical Business Rules

### R8 - Financial Idempotency
- **Finance Agent NEVER uses `prisma.$transaction` directly**
- All mutations go through `Internal API` (`http://api:3000`)
- Every mutating request **MUST** include `Idempotency-Key` header
- Uses `system_agent` JWT with restricted RBAC role

### R9 - RBAC Compliance
- Orchestrator uses `system_agent` role (NOT admin)
- Read-only database access via `@tad/database`
- Mutations only via authenticated internal API calls

### R2/R5 - Resource Protection
- **CPU Limit: 0.5 cores (50%)**
- **RAM Limit: 512MB**
- Configured in Easypanel Advanced → Resources
- Prevents DoS on shared VPS (telemetry/realtime)

## Quick Start

### 1. Local Development
```bash
# Install dependencies
npm install

# Build
npm run build -w apps/agents-orchestrator

# Run locally
npm run dev -w apps/agents-orchestrator
```

### 2. Environment Setup
```bash
cp apps/agents-orchestrator/.env.example apps/agents-orchestrator/.env
# Edit .env with your values
```

### 3. Generate System Agent Token
```bash
# Run in API container or local with JWT_SECRET
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'system_agent', role: 'system_agent', type: 'service' },
  process.env.JWT_SECRET,
  { expiresIn: '1y' }
);
console.log(token);
"
```

### 4. Docker Build (Local Test)
```bash
docker build -f Dockerfile.agents -t tad-agents .
docker run --env-file apps/agents-orchestrator/.env tad-agents
```

## Easypanel Deployment

### Service Configuration
1. **Create New Service** → Type: "App"
2. **Source**: GitHub Repository
3. **Build Method**: Dockerfile
4. **Dockerfile Path**: `Dockerfile.agents`
5. **Environment Variables** (from `.env.example`):
   - `DATABASE_URL`
   - `INTERNAL_API_URL=http://api:3000`
   - `SYSTEM_AGENT_TOKEN=<generated_token>`
   - `FREE_TIER_API_KEY=<groq/gemini_key>`
6. **Advanced → Resources** (CRITICAL):
   - **CPU**: `0.5` (50% of one core)
   - **RAM**: `512MB`

### Deploy
Click **Deploy** in Easypanel. Verify:
- Build completes without errors
- Container starts and stays running
- No crash loops

## Verification

### 1. Container Health
```bash
docker stats tad-agents
# CPU should stay ≤ 50%, RAM ≤ 512MB, no restarts
```

### 2. Orchestrator Logs
```bash
docker logs --tail 100 tad-agents
# Should show heartbeat: "🔄 Starting orchestration cycle"
# And task assignments: "✅ Task <id> (finance) completed"
```

### 3. R8 Audit (Idempotency)
```bash
docker logs tad-api | grep system_agent
# Should show API calls with Idempotency-Key headers
```

## Task Types

| Agent | Tasks | Mutation Method |
|-------|-------|-----------------|
| Systems | Error analysis, performance optimization | Read-only (logs) |
| Marketing | Campaign optimization, advertiser outreach | Read-only (DB) |
| Finance | Earnings calculation, payout processing | **Internal API + Idempotency-Key** |
| HR | Driver onboarding, compliance checks | Read-only (DB) |

## Monitoring

Key metrics to watch:
- Task queue depth (should stay low)
- Task completion rate
- API error rate from finance mutations
- Resource usage (CPU/RAM)

## Rollback

1. **Emergency Stop**: Easypanel → Service → Stop
2. **Data Correction**: Query audit log for `system_agent` actions, run reversal script
3. **Key Rotation**: Update `FREE_TIER_API_KEY` in Easypanel env, redeploy

## Adding New Agent Capabilities

1. Add new task type in `evaluate<Agent>Tasks()`
2. Add handler in `execute<Agent>Task()`
3. For mutations: **ALWAYS use internalApi with Idempotency-Key**
4. Test locally, then deploy

## License

PROPRIETARY - TAD Dominicana