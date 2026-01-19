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

## [LOCKED] Anti-Duct-Tape Rules

### REGRA 1: Anti-Duct-Tape (Geral)

> **NUNCA "fazer passar" — sempre "fazer certo"**

Antes de implementar qualquer fix:
1. Identificar a **CAUSA RAIZ**, não o sintoma
2. Perguntar: "Essa solução preserva ou sacrifica funcionalidade?"
3. Perguntar: "Estou removendo código/dados para evitar um erro?"
4. Se a resposta for SIM → **PARAR e repensar**

```
O objetivo nunca é "ausência de erro".
O objetivo é "presença de valor alinhado com a missão".

Caminho fácil ≠ Caminho certo
```

### REGRA 2: Schema Supabase (Específica)

> **NUNCA sacrificar dados para resolver erros de schema**

Se um erro indicar:
- `"Column X does not exist"`
- `"Could not find column X"`
- `"PGRST204"` ou similar

**A solução CORRETA é:**
→ Reportar a Blue para criar migration que ADICIONE a coluna ao schema

**A solução PROIBIDA é:**
→ Remover o campo do código para "fazer passar"

```
Dados que APIs externas (Stripe, etc.) nos enviam são VALIOSOS.
O schema se adapta aos dados. O código não descarta dados.
```

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

## 🔌 Guia de Integração para Novos Apps

> **Esta seção contém TUDO que um novo app precisa para se conectar ao Auth Hub.**

### Visão Geral da Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SEU APP       │────▶│   AUTH HUB      │────▶│   STRIPE        │
│ (Calculator,    │     │ (HERMES)        │     │                 │
│  Timekeeper,    │     │                 │     │                 │
│  etc.)          │◀────│                 │◀────│   Webhook       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌───────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐                 │
│  │  auth.users         │  │  billing_subscriptions│                │
│  │  (usuários)         │  │  (assinaturas)       │                │
│  └─────────────────────┘  └─────────────────────┘                 │
│                           ┌─────────────────────┐                 │
│                           │  payment_history    │                 │
│                           │  (histórico)        │                 │
│                           └─────────────────────┘                 │
│                           ┌─────────────────────┐                 │
│                           │  checkout_codes     │                 │
│                           │  (short codes)      │                 │
│                           └─────────────────────┘                 │
└───────────────────────────────────────────────────────────────────┘
```

---

### 📋 Checklist de Integração

#### 1. Configuração no Stripe (Blue faz)

- [ ] Criar produto no Stripe Dashboard
- [ ] Criar price (ex: `price_xxx`)
- [ ] Adicionar env var no Auth Hub: `STRIPE_PRICE_NOVOAPP=price_xxx`

#### 2. Configuração no Auth Hub (HERMES faz)

- [ ] Adicionar app em `lib/stripe.ts`:
  ```typescript
  // Em AppName type
  export type AppName = 'calculator' | 'timekeeper' | 'novoapp';

  // Em getAppConfig()
  novoapp: {
    name: 'novoapp',
    displayName: 'OnSite NovoApp Pro',
    priceId: process.env.STRIPE_PRICE_NOVOAPP || '',
    successUrl: process.env.NEXT_PUBLIC_NOVOAPP_URL || 'https://novoapp.vercel.app',
    cancelUrl: process.env.NEXT_PUBLIC_NOVOAPP_URL || 'https://novoapp.vercel.app',
  },

  // Em isValidApp()
  return ['calculator', 'timekeeper', 'novoapp'].includes(app);
  ```

#### 3. Configuração no Supabase (Blue faz)

- [ ] Tabela `billing_subscriptions` já suporta qualquer app via coluna `app_name`
- [ ] Não precisa criar nova tabela

#### 4. Configuração no Seu App (Agente do App faz)

- [ ] Compartilhar mesmo `CHECKOUT_JWT_SECRET` do Auth Hub
- [ ] Implementar geração de JWT ou usar Short Code flow
- [ ] Implementar query de subscription status

---

### 🔗 Métodos de Checkout

O Auth Hub suporta **3 métodos** para iniciar checkout:

#### Método 1: Short Code (RECOMENDADO para Mobile)

> Ideal para apps mobile onde URLs longas são truncadas.

**Fluxo:**
```
App → Cria código na tabela checkout_codes → Abre URL curta → Auth Hub valida → Stripe
```

**1. App cria código no Supabase:**
```typescript
const code = generateShortCode(); // ex: "A1B2C3"

await supabase.from('checkout_codes').insert({
  code: code,
  user_id: userId,
  email: userEmail,
  app: 'calculator',
  redirect_url: 'onsitecalculator://auth-callback', // Deep link de retorno
  expires_at: new Date(Date.now() + 60000).toISOString(), // 60 segundos
  used: false,
});
```

**2. App abre URL curta:**
```typescript
const url = 'https://auth.onsiteclub.ca/r/' + code;
// Exemplo: https://auth.onsiteclub.ca/r/A1B2C3

Linking.openURL(url);
```

**3. Tabela `checkout_codes` (schema):**
```sql
CREATE TABLE checkout_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  app TEXT NOT NULL,
  redirect_url TEXT,              -- Deep link para retorno ao app
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### Método 2: Email-Only Flow (Simples)

> Ideal quando você tem o email mas não precisa de JWT.

**URL:**
```
https://auth.onsiteclub.ca/checkout/{app}?prefilled_email={email}&user_id={userId}
```

**Exemplo:**
```
https://auth.onsiteclub.ca/checkout/calculator?prefilled_email=user@email.com&user_id=550e8400-...
```

**Notas:**
- `user_id` é opcional - se não fornecido, webhook resolve via Supabase Auth pelo email
- Requer que o email exista em `auth.users`

---

#### Método 3: JWT Token (Legacy)

> Mais seguro, mas requer compartilhamento de secret.

**URL:**
```
https://auth.onsiteclub.ca/checkout/{app}?token={JWT}
```

**Estrutura do JWT:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // user_id
  "email": "user@example.com",
  "app": "calculator",
  "iat": 1705432800,                              // issued at
  "exp": 1705433100,                              // expires (5 min)
  "jti": "unique-token-id"                        // anti-replay
}
```

**Assinatura:** HMAC-SHA256 com `CHECKOUT_JWT_SECRET`

---

### 📡 Endpoints do Auth Hub

| Endpoint | Método | Descrição | Params |
|----------|--------|-----------|--------|
| `/checkout/{app}` | GET | Página de checkout | `token`, `prefilled_email`, `user_id`, `redirect` |
| `/r/{code}` | GET | Redirect via short code | code na URL |
| `/checkout/success` | GET | Página de sucesso | `app`, `session_id`, `redirect` |
| `/api/webhooks/stripe` | POST | Webhook do Stripe | Body: Stripe event |
| `/api/subscription/status` | GET | Status da subscription | `app` (query) |
| `/api/portal` | POST | Portal do cliente Stripe | `returnUrl` (body) |

---

### 📊 Consultar Status de Subscription

**Direto no Supabase (RECOMENDADO):**
```typescript
const { data } = await supabase
  .from('billing_subscriptions')
  .select('status, current_period_end, cancel_at_period_end')
  .eq('user_id', userId)
  .eq('app_name', 'calculator')
  .single();

const isPremium = data?.status === 'active' || data?.status === 'trialing';
```

**Via API do Auth Hub:**
```typescript
const response = await fetch(
  'https://auth.onsiteclub.ca/api/subscription/status?app=calculator',
  {
    headers: {
      'Authorization': `Bearer ${supabaseAccessToken}`
    }
  }
);
const { status, isPremium } = await response.json();
```

---

### 🔄 Redirecionamento Após Pagamento

**Fluxo completo:**
```
Stripe Success → /checkout/success?app=X&redirect=Y → Auto-redirect ou botão
```

**Comportamento da página de sucesso:**

| Tipo de `redirect` | Comportamento |
|--------------------|---------------|
| Deep link (`onsitecalculator://...`) | Auto-redirect em 3s + botão "Voltar ao App" |
| URL web (`https://...`) | Mostra mensagem + "feche esta janela" |
| Não fornecido | Usa `successUrl` do app config |

**Deep links suportados:**
- `onsiteclub://`
- `onsitecalculator://`
- `onsitetimekeeper://`

---

### 🗄️ Tabelas Supabase Relevantes

#### `billing_subscriptions` (subscription ativa)

```sql
SELECT * FROM billing_subscriptions
WHERE user_id = 'xxx' AND app_name = 'calculator';
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| user_id | UUID | FK para auth.users |
| app_name | TEXT | 'calculator', 'timekeeper', etc. |
| status | TEXT | 'active', 'trialing', 'canceled', 'past_due' |
| stripe_customer_id | TEXT | ID do cliente no Stripe |
| stripe_subscription_id | TEXT | ID da subscription no Stripe |
| current_period_end | TIMESTAMPTZ | Quando expira |
| cancel_at_period_end | BOOLEAN | Vai cancelar no fim do período? |
| customer_email | TEXT | Email do pagador |
| customer_name | TEXT | Nome do pagador |
| billing_address_* | TEXT | Endereço de cobrança |

#### `payment_history` (histórico de pagamentos)

```sql
SELECT * FROM payment_history
WHERE user_id = 'xxx' ORDER BY paid_at DESC;
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| user_id | UUID | FK para auth.users |
| app_name | TEXT | App relacionado |
| amount | INTEGER | Valor em centavos |
| currency | TEXT | 'cad', 'usd' |
| status | TEXT | 'succeeded', 'refunded' |
| paid_at | TIMESTAMPTZ | Data do pagamento |

#### `checkout_codes` (códigos temporários)

```sql
SELECT * FROM checkout_codes WHERE code = 'ABC123';
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| code | TEXT | Código único (6 chars) |
| user_id | UUID | Usuário |
| email | TEXT | Email do usuário |
| app | TEXT | App destino |
| redirect_url | TEXT | Deep link de retorno |
| expires_at | TIMESTAMPTZ | Expira em 60s |
| used | BOOLEAN | Já foi usado? |

---

### 🔐 Variáveis de Ambiente

**No Auth Hub (já configuradas):**
```bash
CHECKOUT_JWT_SECRET=xxx          # Compartilhar com apps que usam JWT
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Não compartilhar
SUPABASE_SERVICE_ROLE_KEY=xxx    # Não compartilhar
```

**No Seu App (você configura):**
```bash
# Supabase (mesmo projeto)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Auth Hub
AUTH_HUB_URL=https://auth.onsiteclub.ca

# Apenas se usar JWT flow
CHECKOUT_JWT_SECRET=xxx  # Pedir para Blue
```

---

### 📝 Exemplo Completo: Novo App "Shop"

**1. Blue cria produto no Stripe:**
- Produto: "OnSite Shop Pro"
- Price ID: `price_shop_123`

**2. HERMES atualiza Auth Hub:**
```typescript
// lib/stripe.ts
export type AppName = 'calculator' | 'timekeeper' | 'shop';

shop: {
  name: 'shop',
  displayName: 'OnSite Shop Pro',
  priceId: process.env.STRIPE_PRICE_SHOP || '',
  successUrl: 'https://shop.onsiteclub.ca',
  cancelUrl: 'https://shop.onsiteclub.ca',
},
```

**3. App Shop implementa checkout:**
```typescript
// Opção A: Short Code (mobile)
const code = crypto.randomUUID().substring(0, 6).toUpperCase();
await supabase.from('checkout_codes').insert({
  code,
  user_id: userId,
  email: userEmail,
  app: 'shop',
  redirect_url: 'onsiteshop://payment-success',
  expires_at: new Date(Date.now() + 60000).toISOString(),
  used: false,
});
window.open(`https://auth.onsiteclub.ca/r/${code}`);

// Opção B: Email-only (web)
window.open(`https://auth.onsiteclub.ca/checkout/shop?prefilled_email=${email}&user_id=${userId}`);
```

**4. App Shop verifica subscription:**
```typescript
const { data } = await supabase
  .from('billing_subscriptions')
  .select('status')
  .eq('user_id', userId)
  .eq('app_name', 'shop')
  .single();

if (data?.status === 'active') {
  // Usuário é premium
}
```

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
| 2026-01-19 | v1.5 | Guia de Integração completo, Short Code redirect_url, SuccessClient auto-redirect |
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

*Última atualização: 2026-01-19 (v1.5)*
