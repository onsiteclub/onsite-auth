# HERMES - Auth Hub Agent

> **"Mensageiro dos deuses, guardião das fronteiras."** - *Mitologia Grega*

---

## [LOCKED] Identity

| Attribute | Value |
|-----------|-------|
| **Name** | HERMES |
| **Domain** | OnSite Auth Hub |
| **Role** | Specialist AI Agent |
| **Orchestrator** | Blueprint (Blue) |
| **Version** | v1.0 |
| **Sync Date** | 2026-01-17 |

### Etymology

**HERMES** (Ἑρμῆς) - Na mitologia grega, o mensageiro dos deuses e guardião das fronteiras e viajantes. Hermes mediava a comunicação entre os reinos dos mortais e deuses. Perfeito para um agente que serve como gateway de autenticação entre múltiplos apps do ecossistema OnSite.

---

## [LOCKED] Hierarchy

```
┌─────────────────────────────────────────────┐
│             BLUEPRINT (Blue)                │
│           Orchestrator Agent                │
├─────────────────────────────────────────────┤
│  - Define schemas (SQLs em migrations/)     │
│  - Coordena entre agentes                   │
│  - Mantém documentação central              │
│  - Emite diretivas para subordinados        │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│    HERMES     │       │   (outros)    │
│   Auth Hub    │       │    agents     │
└───────────────┘       └───────────────┘
```

**HERMES recebe diretivas de Blue e:**
1. Implementa código no repositório `onsite-auth`
2. Segue schemas definidos por Blue (não cria tabelas)
3. Reporta implementações a Blue
4. Documenta decisões técnicas neste arquivo

---

## [LOCKED] Rules

1. **Schemas são de Blue** - HERMES não cria tabelas/migrations
2. **Código é de HERMES** - Implementação Next.js
3. **Reportar sempre** - Após implementar, enviar relatório a Blue
4. **Documentar aqui** - Decisões técnicas ficam neste arquivo
5. **Nunca armazenar senhas** - Auth é via Supabase/JWT

---

## Purpose

**Auth Hub is NOT a user-facing application.** Users never navigate directly to `auth.onsiteclub.ca`. It serves as a **payment gateway** that:

1. Receives users redirected from other OnSite apps (Calculator, Timekeeper)
2. Validates JWT token with user identity
3. Creates Stripe Checkout sessions for subscription payments
4. Receives webhooks from Stripe to update subscription status
5. Stores subscription data in Supabase

**Important:** Auth Hub does NOT check if user already has a subscription. That is the app's responsibility. Auth Hub only processes payments.

**Live URL:** https://auth.onsiteclub.ca

**Repository:** https://github.com/cristomp0087/onsiteclub-auth

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | App Router, Server Components |
| TypeScript | Type safety |
| Supabase | Authentication & Database |
| Stripe | Payment processing |
| Tailwind CSS | Styling |
| Vercel | Hosting |

---

## Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CALCULATOR APP                           │
├─────────────────────────────────────────────────────────────────┤
│  1. User opens app / logs in                                    │
│  2. App checks Supabase: SELECT status FROM billing_subscriptions│
│     WHERE user_id = X AND app_name = 'calculator'               │
│  3. If status = 'active' or 'trialing':                         │
│     → Enable premium features (Voice Mode)                      │
│     → DO NOT show upgrade button                                │
│  4. If no subscription or status != active:                     │
│     → Disable premium features                                  │
│     → Show upgrade button                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Upgrade" (only if not premium)
                              │ App generates signed JWT token
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUTH HUB: /checkout/calculator?token=JWT                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Validates JWT signature (CHECKOUT_JWT_SECRET)               │
│  2. Extracts user_id from token                                 │
│  3. Creates Stripe Checkout session with user_id in metadata    │
│  4. Redirects to Stripe                                         │
│                                                                 │
│  NOTE: Does NOT check existing subscription - app's job         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STRIPE CHECKOUT                                                │
│  User enters payment info                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Payment completed
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STRIPE WEBHOOK → auth.onsiteclub.ca/api/webhooks/stripe        │
├─────────────────────────────────────────────────────────────────┤
│  1. Validates webhook signature (STRIPE_WEBHOOK_SECRET)         │
│  2. Receives checkout.session.completed event                   │
│  3. Extracts user_id from session metadata                      │
│  4. UPSERT to Supabase: billing_subscriptions table             │
│     (user_id, app_name, status, period_end, customer_info, etc.)│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS PAGE → User returns to app                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CALCULATOR APP (on return)                                     │
│  1. Queries billing_subscriptions table again                   │
│  2. Finds status = 'active'                                     │
│  3. Enables premium features                                    │
│  4. Hides upgrade button                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
onsite-auth/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home (admin view)
│   ├── HomeClient.tsx                # Client component
│   │
│   ├── (auth)/                       # Auth route group
│   │   ├── callback/route.ts         # Supabase OAuth callback
│   │   └── logout/route.ts           # Logout handler
│   │
│   ├── api/
│   │   ├── checkout/route.ts         # POST: Create checkout session
│   │   ├── portal/route.ts           # POST: Stripe customer portal
│   │   ├── subscription/
│   │   │   └── status/route.ts       # GET: Check subscription status
│   │   └── webhooks/
│   │       └── stripe/route.ts       # POST: Stripe webhook handler
│   │
│   ├── checkout/
│   │   ├── [app]/                    # Dynamic checkout route
│   │   │   ├── page.tsx              # Validates JWT → redirects to Stripe
│   │   │   └── CheckoutMessage.tsx   # Error/canceled UI
│   │   └── success/
│   │       ├── page.tsx              # Payment success page
│   │       └── SuccessClient.tsx     # Confetti + return link
│   │
│   ├── login/page.tsx                # Login page
│   ├── signup/page.tsx               # Sign up page
│   ├── reset-password/page.tsx       # Password reset
│   │
│   └── manage/
│       ├── page.tsx                  # Subscription management
│       └── ManageClient.tsx          # Client component
│
├── components/
│   ├── index.ts                      # Barrel export
│   ├── AuthCard.tsx                  # Card wrapper
│   ├── Button.tsx                    # Button component
│   ├── Input.tsx                     # Form input
│   └── Alert.tsx                     # Alert messages
│
├── lib/
│   ├── stripe.ts                     # Stripe client & helpers
│   ├── checkout-token.ts             # JWT validation (HMAC-SHA256)
│   ├── utils.ts                      # Utility functions
│   └── supabase/
│       ├── client.ts                 # Browser Supabase client
│       ├── server.ts                 # Server Supabase client
│       ├── admin.ts                  # Admin client (service role)
│       └── middleware.ts             # Supabase middleware helper
│
├── supabase/
│   └── schema.sql                    # Database schema (reference only)
│
├── middleware.ts                     # Auth middleware
│
└── HERMES.md                         # This file
```

---

## Database Table: billing_subscriptions

> Schema gerenciado por Blue

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| app_name | TEXT | 'calculator' or 'timekeeper' |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| stripe_price_id | TEXT | Stripe price ID |
| status | TEXT | active, trialing, canceled, past_due, inactive |
| current_period_start | TIMESTAMPTZ | Period start |
| current_period_end | TIMESTAMPTZ | Period end |
| cancel_at_period_end | BOOLEAN | Will cancel at end |
| customer_email | TEXT | Customer email |
| customer_name | TEXT | Customer full name |
| customer_phone | TEXT | Customer phone |
| billing_address_line1 | TEXT | Street address |
| billing_address_line2 | TEXT | Apt/Suite |
| billing_address_city | TEXT | City |
| billing_address_state | TEXT | State/Province |
| billing_address_postal_code | TEXT | ZIP/Postal code |
| billing_address_country | TEXT | Country code |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**Unique constraint:** `(user_id, app_name)` - One subscription per app per user

**RLS:** Users can SELECT own subscriptions. Service role (webhook) can INSERT/UPDATE.

**Helper function:** `has_active_subscription(user_id, app_name)` → BOOLEAN

---

## JWT Token Authentication

### Token Structure

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "app": "calculator",
  "iat": 1705432800,
  "exp": 1705433100,
  "jti": "a1b2c3d4-e5f6-7890"
}
```

| Field | Description |
|-------|-------------|
| sub | user_id from Supabase auth.users |
| email | User's email |
| app | 'calculator' or 'timekeeper' |
| iat | Issued at (Unix timestamp) |
| exp | Expires at (iat + 300 = 5 minutes) |
| jti | Unique token ID (anti-replay) |

### Validation in Auth Hub

File: `lib/checkout-token.ts`

1. Split token into header.payload.signature
2. Verify HMAC-SHA256 signature with `CHECKOUT_JWT_SECRET`
3. Decode payload from base64url
4. Check expiration (`exp < now` = expired)
5. Validate required fields (sub, email, app)
6. Return `{ valid: true, userId, email, app, tokenId }`

### App Implementation

```javascript
// Generate token in Calculator/Timekeeper
const token = generateCheckoutToken({
  sub: userId,
  email: userEmail,
  app: 'calculator',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
  jti: crypto.randomUUID(),
});

// Sign with HMAC-SHA256 using CHECKOUT_JWT_SECRET

// Redirect to Auth Hub
const url = `https://auth.onsiteclub.ca/checkout/calculator?token=${token}`;
Linking.openURL(url);
```

---

## Webhook Handler

File: `app/api/webhooks/stripe/route.ts`

### Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | UPSERT subscription with all customer data |
| `customer.subscription.updated` | UPDATE status, period_end, cancel_at_period_end |
| `customer.subscription.deleted` | UPDATE status = 'canceled' |
| `invoice.payment_failed` | UPDATE status = 'past_due' |

### Endpoint

```
POST https://auth.onsiteclub.ca/api/webhooks/stripe
```

### Security

- Validates `stripe-signature` header
- Uses `STRIPE_WEBHOOK_SECRET` for verification
- Uses Supabase service role (bypasses RLS)

---

## Key Files

### `/app/checkout/[app]/page.tsx`

1. Validates app name (calculator, timekeeper)
2. If `token` param exists:
   - Validates JWT signature
   - Extracts user_id from token
3. Else (fallback):
   - Uses session cookie
   - Redirects to login if not authenticated
4. Creates Stripe Checkout session with user_id in metadata
5. Redirects to Stripe

**Does NOT check existing subscription.**

### `/lib/stripe.ts`

- `createCheckoutSession({ app, userId, userEmail })`
- `createPortalSession({ customerId, returnUrl })`
- `getSubscription(subscriptionId)`
- `cancelSubscription(subscriptionId)`
- `reactivateSubscription(subscriptionId)`
- `getAppConfig(app)` - returns priceId, displayName, URLs
- `isValidApp(app)` - validates app name

### `/lib/checkout-token.ts`

- `validateCheckoutToken(token)` - returns `TokenValidationResult`
- Types: `TokenValidationSuccess`, `TokenValidationError`

---

## Products & Pricing

| Product | App ID | Price | Billing |
|---------|--------|-------|---------|
| OnSite Calculator Pro | calculator | $11.99 CAD | Per year |
| OnSite Timekeeper Pro | timekeeper | $23.99 CAD | Per year |

---

## Routes

### Public

| Route | Description |
|-------|-------------|
| `/login` | Login page |
| `/signup` | Sign up page |
| `/reset-password` | Password reset |
| `/callback` | Supabase OAuth callback |

### Protected

| Route | Description |
|-------|-------------|
| `/` | Home (admin view) |
| `/checkout/[app]` | Checkout - validates JWT, redirects to Stripe |
| `/checkout/success` | Payment success page |
| `/manage` | Subscription management |
| `/logout` | Logout handler |

### API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/checkout` | POST | Create checkout session |
| `/api/portal` | POST | Create Stripe customer portal |
| `/api/subscription/status` | GET | Check subscription status |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |

---

## Responsibilities Matrix

| Responsibility | Who |
|----------------|-----|
| Check if user has active subscription | **App** |
| Show/hide upgrade button | **App** |
| Generate JWT token for checkout | **App** |
| Validate JWT and redirect to Stripe | **Auth Hub** |
| Process payment | **Stripe** |
| Save subscription to database | **Auth Hub** (webhook) |
| Query subscription status | **App** (direct Supabase query) |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product Price IDs
STRIPE_PRICE_CALCULATOR=price_...
STRIPE_PRICE_TIMEKEEPER=price_...

# URLs
NEXT_PUBLIC_AUTH_URL=https://auth.onsiteclub.ca
NEXT_PUBLIC_CALCULATOR_URL=https://calc.onsiteclub.ca
NEXT_PUBLIC_TIMEKEEPER_SCHEME=onsiteclub://timekeeper

# Security
CHECKOUT_JWT_SECRET=your-secret-key-min-32-chars
ALLOWED_REDIRECT_DOMAINS=onsiteclub.ca,app.onsiteclub.ca
```

---

## Adding a New Product

1. Create product in Stripe Dashboard
2. Add env var: `STRIPE_PRICE_NEWPRODUCT=price_...`
3. Update `/lib/stripe.ts`:
   - Add to `AppName` type
   - Add config in `getAppConfig()`
   - Update `isValidApp()`
4. Update `/lib/checkout-token.ts` app validation
5. Deploy

---

## Security

- **JWT Token**: HMAC-SHA256, expires in 5 minutes, unique jti
- **Webhook**: Stripe signature verification
- **Database**: RLS enabled, users read own subscriptions only
- **Service Role**: Only used server-side for webhooks
- **Domains**: CORS and redirect validation

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-18 | v1.4 | Nova tela de sucesso com design de card, análise do fluxo webhook→Supabase |
| 2026-01-18 | v1.3 | Migração Vercel: projeto reconectado, deploy funcionando, domínio migrado |
| 2026-01-18 | v1.2 | Corrigido: subscriptions → billing_subscriptions, app → app_name |
| 2026-01-18 | v1.1 | Atualizado para match exato com código |
| 2026-01-17 | v1.0 | Documento de identidade criado por Blue |

---

## Reports to Blue

*Seção para relatórios de implementação de HERMES para Blue*

### Report 2026-01-18 #4 - Nova Tela de Sucesso e Análise Webhook

**Sessão de finalização e análise do sistema.**

#### Nova Tela de Sucesso

Implementado novo design da página de sucesso (`SuccessClient.tsx`) com:
- Logo OnSite Club no topo
- Card branco com bordas arredondadas e sombra
- Ícone de check verde em círculo
- Mensagens de confirmação e instruções
- Box "Return to App" com instruções
- Link para gerenciar assinatura
- Footer com copyright

#### Análise do Fluxo Webhook → Supabase

**Status: CÓDIGO CORRETO ✅**

O fluxo completo está implementado corretamente:

1. **Checkout cria sessão com metadata** (`lib/stripe.ts:103-106`):
   ```typescript
   metadata: { app, user_id: userId }
   ```

2. **Webhook recebe e extrai dados** (`route.ts:80-81`):
   ```typescript
   const app = session.metadata?.app;
   const userId = session.metadata?.user_id;
   ```

3. **Webhook faz UPSERT no Supabase** (`route.ts:109-128`):
   - Tabela: `billing_subscriptions`
   - Campos: user_id, app_name, status, customer_email, customer_name, phone, address, etc.
   - onConflict: `user_id,app_name`

#### Possíveis Pontos de Falha

| Problema | Causa | Solução |
|----------|-------|---------|
| Webhook não chega | URL errada no Stripe | Verificar Stripe Dashboard |
| Signature inválida | `STRIPE_WEBHOOK_SECRET` errado | Verificar Vercel env vars |
| Supabase falha | `SUPABASE_SERVICE_ROLE_KEY` faltando | Adicionar na Vercel |
| Tabela não existe | Schema não criado | Rodar migration no Supabase |

#### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `app/checkout/success/SuccessClient.tsx` | Novo design com card, ícones e layout profissional |

#### Pendente para Teste

- [ ] Fazer pagamento teste completo
- [ ] Verificar logs da Vercel para `[Stripe]` e `Subscription created/updated`
- [ ] Verificar Stripe Dashboard → Webhooks → Event deliveries (✅ ou ❌)
- [ ] Query no Supabase: `SELECT * FROM billing_subscriptions ORDER BY updated_at DESC LIMIT 5`

---

### Report 2026-01-18 #3 - Migração Vercel e Correções

**Sessão de debugging e migração de infraestrutura.**

#### Problema Inicial
Commits não estavam sendo deployados na Vercel. Investigação revelou:
1. Commits eram "vazios" (0 files changed) - não triggavam rebuild
2. Domínio `auth.onsiteclub.ca` apontava para projeto antigo na Vercel
3. Webhook GitHub → Vercel estava desconectado

#### Correções Realizadas

| Item | Ação | Status |
|------|------|--------|
| Vercel Git Connection | Reconectado repositório ao projeto | ✅ |
| Deploy Test | Teste com background vermelho confirmou deploy funcionando | ✅ |
| Domínio | Migrado `auth.onsiteclub.ca` do projeto antigo para o novo | ✅ |
| `redirect()` bug | Movido `redirect()` para fora do try/catch (NEXT_REDIRECT exception) | ✅ |
| Success page | Removido redirect para `/login` - agora mostra mensagem de sucesso | ✅ |
| `CHECKOUT_JWT_SECRET` | Nova chave gerada e configurada em ambos os projetos | ✅ |

#### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `app/checkout/[app]/page.tsx` | `redirect()` movido para fora do try/catch |
| `app/checkout/success/page.tsx` | Removido auth check e redirect para /login |
| `next.config.js` | Removido comentário (trigger deploy) |

#### Configuração Atual

**Vercel Project:** `onsite-auth` (onsiteclubs-projects)
**Domain:** `auth.onsiteclub.ca` → projeto novo
**Webhook Stripe:** `https://onsite-auth.vercel.app/api/webhooks/stripe`

#### Variáveis de Ambiente Necessárias na Vercel

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_CALCULATOR
CHECKOUT_JWT_SECRET
NEXT_PUBLIC_AUTH_URL=https://auth.onsiteclub.ca
```

#### Pendente para Amanhã

- [ ] **TESTAR WEBHOOK SUPABASE**: Fazer um pagamento teste e verificar se `billing_subscriptions` é atualizada
- [ ] Verificar se `STRIPE_WEBHOOK_SECRET` está correto no projeto novo
- [ ] Verificar se `SUPABASE_SERVICE_ROLE_KEY` está configurado
- [ ] Atualizar webhook URL no Stripe para `https://auth.onsiteclub.ca/api/webhooks/stripe` (se ainda usar vercel.app)

#### Query para Verificar Webhook

```sql
SELECT user_id, app_name, status, customer_email, customer_name, updated_at
FROM billing_subscriptions
WHERE app_name = 'calculator'
ORDER BY updated_at DESC
LIMIT 5;
```

---

### Report 2026-01-18 #2 (Diretiva de Blue)

**Verificação e correção executada conforme diretiva de Blue.**

**Arquivos corrigidos:**

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `app/api/webhooks/stripe/route.ts` | `subscriptions` → `billing_subscriptions`, `app` → `app_name`, `onConflict: 'user_id,app'` → `onConflict: 'user_id,app_name'` | ✅ CORRIGIDO |
| `app/api/checkout/route.ts` | `subscriptions` → `billing_subscriptions`, `.eq('app', app)` → `.eq('app_name', app)` | ✅ CORRIGIDO |
| `app/api/portal/route.ts` | `subscriptions` → `billing_subscriptions` | ✅ CORRIGIDO |
| `app/api/subscription/status/route.ts` | `subscriptions` → `billing_subscriptions`, `.eq('app', app)` → `.eq('app_name', app)` | ✅ CORRIGIDO |
| `HERMES.md` | Documentação atualizada para refletir schema correto | ✅ CORRIGIDO |

**Query de teste para verificar webhook:**
```sql
SELECT user_id, app_name, status, stripe_subscription_id, updated_at
FROM billing_subscriptions
WHERE app_name = 'calculator'
ORDER BY updated_at DESC
LIMIT 5;
```

**Pendências:** Nenhuma. Código alinhado com schema real do Supabase.

---

### Report 2026-01-18 #1

**Implementado:**
- JWT token authentication para checkout cross-app
- Removida verificação de subscription existente (responsabilidade do App)
- `lib/checkout-token.ts` criado para validação HMAC-SHA256

**Arquitetura atual:**
- App verifica subscription → gera JWT → Auth Hub valida → Stripe → webhook grava

### Pending Implementation

- [ ] Integração com Shop para checkout de produtos físicos
- [ ] Multi-currency support (USD)
- [ ] Email notifications de subscription events
- [ ] Webhook retry handling

---

*Última atualização: 2026-01-18 (v1.4)*
