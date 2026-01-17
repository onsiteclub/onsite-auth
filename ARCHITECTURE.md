# OnSite Auth Hub - Architecture Documentation

## Overview

OnSite Auth Hub is a centralized authentication and payment gateway for the OnSite Club ecosystem. It handles user authentication via Supabase and subscription payments via Stripe for multiple applications.

**Live URL:** https://auth.onsiteclub.ca

**Repository:** https://github.com/cristomp0087/onsiteclub-auth

**Hosting:** Vercel

---

## Purpose

This is **NOT** a user-facing application. Users never navigate directly to `auth.onsiteclub.ca`. Instead, it serves as a gateway that:

1. Receives users redirected from other OnSite apps (Calculator, Timekeeper)
2. Authenticates users via Supabase
3. Creates Stripe Checkout sessions for subscription payments
4. Receives webhooks from Stripe to update subscription status
5. Stores subscription data in Supabase

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CALCULATOR APP                           │
├─────────────────────────────────────────────────────────────────┤
│  1. User opens app / logs in                                    │
│  2. App checks Supabase: SELECT status FROM subscriptions       │
│     WHERE user_id = X AND app = 'calculator'                    │
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
│  1. Receives checkout.session.completed event                   │
│  2. Extracts user_id from metadata                              │
│  3. Saves to Supabase: subscriptions table                      │
│     (user_id, app, status='active', period_end, etc.)           │
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
│  1. Queries subscriptions table again                           │
│  2. Finds status = 'active'                                     │
│  3. Enables premium features                                    │
│  4. Hides upgrade button                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | App Router, Server Components, API Routes |
| **TypeScript** | Type safety |
| **Supabase** | Authentication & Database |
| **Stripe** | Payment processing & Subscriptions |
| **Tailwind CSS** | Styling |
| **Vercel** | Hosting & Deployment |

---

## Project Structure

```
onsite-auth/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page (admin view)
│   ├── HomeClient.tsx            # Client component for home
│   │
│   ├── api/                      # API Routes
│   │   ├── checkout/
│   │   │   └── route.ts          # POST: Create checkout session
│   │   ├── portal/
│   │   │   └── route.ts          # POST: Create Stripe portal session
│   │   ├── subscription/
│   │   │   └── status/
│   │   │       └── route.ts      # GET: Check subscription status
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts      # POST: Stripe webhook handler
│   │
│   ├── callback/
│   │   └── route.ts              # Supabase auth callback
│   │
│   ├── checkout/
│   │   ├── [app]/                # Dynamic checkout route
│   │   │   ├── page.tsx          # Checkout page (redirects to Stripe)
│   │   │   └── CheckoutMessage.tsx
│   │   └── success/
│   │       ├── page.tsx          # Payment success page
│   │       └── SuccessClient.tsx
│   │
│   ├── login/
│   │   └── page.tsx              # Login page
│   │
│   ├── logout/
│   │   └── route.ts              # Logout handler
│   │
│   ├── manage/
│   │   ├── page.tsx              # Subscription management
│   │   └── ManageClient.tsx
│   │
│   ├── signup/
│   │   └── page.tsx              # Sign up page
│   │
│   └── reset-password/
│       └── page.tsx              # Password reset
│
├── components/                   # Reusable UI components
│   ├── index.ts                  # Barrel export
│   ├── AuthCard.tsx              # Card wrapper for auth pages
│   ├── Button.tsx                # Button component
│   ├── Input.tsx                 # Form input
│   └── Alert.tsx                 # Alert messages
│
├── lib/                          # Utilities and configurations
│   ├── stripe.ts                 # Stripe client & helpers
│   ├── checkout-token.ts         # JWT token validation for cross-app auth
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       ├── server.ts             # Server Supabase client
│       └── admin.ts              # Admin client (service role)
│
├── supabase/
│   └── schema.sql                # Database schema
│
├── middleware.ts                 # Auth middleware
│
├── public/                       # Static assets
│   └── images/
│       └── logo.svg
│
└── .env.example                  # Environment variables template
```

---

## Key Files Explained

### `/lib/stripe.ts`
Central configuration for Stripe. Defines:
- App configurations (Calculator, Timekeeper)
- Price IDs for each product
- `createCheckoutSession()` - Creates Stripe checkout
- `createPortalSession()` - Creates customer portal

### `/app/api/webhooks/stripe/route.ts`
Handles Stripe events:
- `checkout.session.completed` - Saves new subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Marks subscription as canceled
- `invoice.payment_failed` - Marks subscription as past_due

### `/lib/checkout-token.ts`
JWT token validation for secure cross-app authentication:
- Validates HMAC-SHA256 signature
- Checks token expiration (5 minutes)
- Extracts user_id, email, app from token payload

### `/app/checkout/[app]/page.tsx`
Dynamic route that:
1. Validates app name (calculator, timekeeper)
2. Validates JWT token from app (preferred) or falls back to session cookie
3. Creates Stripe checkout session with user_id in metadata
4. Redirects to Stripe

**Important:** This page does NOT check if user already has a subscription. That is the app's responsibility. The auth hub only processes payments.

### `/middleware.ts`
Protects routes and manages auth sessions.

---

## Database Schema (Supabase)

### Table: `subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| app | TEXT | 'calculator' or 'timekeeper' |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| stripe_price_id | TEXT | Stripe price ID |
| status | TEXT | 'active', 'canceled', 'past_due', 'inactive', 'trialing' |
| current_period_start | TIMESTAMPTZ | Subscription period start |
| current_period_end | TIMESTAMPTZ | Subscription period end |
| cancel_at_period_end | BOOLEAN | Will cancel at period end |
| customer_email | TEXT | Customer email |
| customer_name | TEXT | Customer full name |
| customer_phone | TEXT | Customer phone |
| billing_address_* | TEXT | Billing address fields |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Unique constraint:** One subscription per app per user (`user_id`, `app`)

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
ALLOWED_REDIRECT_DOMAINS=onsiteclub.ca,app.onsiteclub.ca

# Cross-App JWT Authentication
# Shared secret with Calculator/Timekeeper apps for secure checkout
# Must be the same value in both auth hub and app's Vercel environment
CHECKOUT_JWT_SECRET=your-secret-key-min-32-chars
```

---

## Products & Pricing

| Product | App ID | Price | Billing |
|---------|--------|-------|---------|
| OnSite Calculator Pro | calculator | $11.99 CAD | Per year |
| OnSite Timekeeper Pro | timekeeper | $23.99 CAD | Per year |

---

## Routes

### Public Routes
| Route | Description |
|-------|-------------|
| `/login` | Login page |
| `/signup` | Sign up page |
| `/reset-password` | Password reset |
| `/callback` | Supabase auth callback |

### Protected Routes (require authentication)
| Route | Description |
|-------|-------------|
| `/` | Home (admin view - lists products) |
| `/checkout/[app]` | Checkout for specific app |
| `/checkout/success` | Payment success page |
| `/manage` | Manage subscriptions |
| `/logout` | Logout |

### API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/checkout` | POST | Create checkout session |
| `/api/portal` | POST | Create Stripe customer portal |
| `/api/subscription/status` | GET | Check subscription status |
| `/api/webhooks/stripe` | POST | Stripe webhook endpoint |

---

## Integration with Other Apps

### Responsibilities

| Responsibility | Who |
|----------------|-----|
| Check if user has active subscription | **App** |
| Show/hide upgrade button | **App** |
| Generate JWT token for checkout | **App** |
| Validate JWT and redirect to Stripe | **Auth Hub** |
| Process payment | **Stripe** |
| Save subscription to database | **Auth Hub** (webhook) |
| Query subscription status | **App** |

### OnSite Calculator (Mobile App)

**1. Check subscription status (on app start / after login):**
```javascript
const { data } = await supabase
  .from('subscriptions')
  .select('status')
  .eq('user_id', userId)
  .eq('app', 'calculator')
  .single();

const isPremium = data?.status === 'active' || data?.status === 'trialing';

if (isPremium) {
  enableVoiceMode();
  hideUpgradeButton();  // IMPORTANT: Don't show upgrade if already premium
} else {
  disableVoiceMode();
  showUpgradeButton();
}
```

**2. Redirect to checkout (only if NOT premium):**
```javascript
// Generate JWT token with user identity
const token = generateCheckoutToken({
  sub: userId,           // user_id from Supabase
  email: userEmail,
  app: 'calculator',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,  // 5 minutes
  jti: crypto.randomUUID(),
});

// Redirect to auth hub with token
const checkoutUrl = `https://auth.onsiteclub.ca/checkout/calculator?token=${token}`;
Linking.openURL(checkoutUrl);
```

**JWT Token Structure:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // user_id
  "email": "user@example.com",
  "app": "calculator",
  "iat": 1705432800,      // issued at
  "exp": 1705433100,      // expires in 5 min
  "jti": "unique-id"      // anti-replay
}
```

**Important:** The JWT must be signed with `CHECKOUT_JWT_SECRET` using HMAC-SHA256.

### OnSite Timekeeper (Mobile App)

Same as above, but use:
- App name: `'timekeeper'`
- Checkout URL: `https://auth.onsiteclub.ca/checkout/timekeeper?token=JWT`

---

## Webhook Configuration (Stripe)

**Endpoint URL:**
```
https://auth.onsiteclub.ca/api/webhooks/stripe
```

**Events to listen:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## Deployment

### Automatic Deployment
Every push to `main` branch triggers automatic deployment on Vercel.

### Manual Redeploy
1. Go to Vercel Dashboard
2. Select project `onsiteclub-auth`
3. Click Deployments → Redeploy

### Environment Variables
Set in Vercel Dashboard → Settings → Environment Variables

---

## Adding a New Product

1. **Create product in Stripe Dashboard**
   - Go to Products → Create product
   - Set name, price, billing interval
   - Copy the Price ID (`price_...`)

2. **Add environment variable in Vercel**
   ```
   STRIPE_PRICE_NEWPRODUCT=price_...
   ```

3. **Update `/lib/stripe.ts`**
   ```typescript
   export type AppName = 'calculator' | 'timekeeper' | 'newproduct';

   // Add to configs object:
   newproduct: {
     name: 'newproduct',
     displayName: 'OnSite NewProduct Pro',
     priceId: process.env.STRIPE_PRICE_NEWPRODUCT || '',
     successUrl: process.env.NEXT_PUBLIC_NEWPRODUCT_URL || 'https://...',
     cancelUrl: process.env.NEXT_PUBLIC_NEWPRODUCT_URL || 'https://...',
   },

   // Update isValidApp:
   return ['calculator', 'timekeeper', 'newproduct'].includes(app);
   ```

4. **Update HomeClient.tsx** (if needed)
   Add the new product to the `apps` array.

5. **Deploy**
   Push changes and Vercel will auto-deploy.

---

## Security Considerations

- **Row Level Security (RLS)** enabled on `subscriptions` table
- Users can only read their own subscriptions
- Webhook uses signature verification (`STRIPE_WEBHOOK_SECRET`)
- Service role key only used server-side for webhook operations
- CORS and redirect domain validation
- **JWT Token Authentication** for cross-app checkout:
  - Signed with HMAC-SHA256 using shared secret (`CHECKOUT_JWT_SECRET`)
  - Tokens expire in 5 minutes
  - Contains unique `jti` (JWT ID) for anti-replay protection
  - Prevents session mixing between different users

---

## Troubleshooting

### Checkout Error
1. Check Vercel Logs for error message
2. Verify `STRIPE_PRICE_*` environment variable is set
3. Verify Stripe API keys are correct
4. Check if product/price exists in Stripe
5. If using JWT token: verify `CHECKOUT_JWT_SECRET` matches between app and auth hub

### Invalid Token Error
1. Verify `CHECKOUT_JWT_SECRET` is the same in both projects (app and auth hub)
2. Check token expiration (tokens are valid for 5 minutes only)
3. Verify JWT structure has all required fields: `sub`, `email`, `app`, `iat`, `exp`, `jti`
4. Check Vercel Logs for specific validation error

### Webhook Not Saving Data
1. Check Stripe Webhook logs for errors
2. Verify `STRIPE_WEBHOOK_SECRET` matches
3. Check Vercel Logs for webhook errors
4. Verify Supabase connection

### User Not Seeing Subscription
1. Check `subscriptions` table in Supabase
2. Verify webhook was received (Stripe Dashboard → Webhooks → Events)
3. Check if `user_id` matches

---

## Support

- **Repository Issues:** https://github.com/cristomp0087/onsiteclub-auth/issues
- **Email:** support@onsiteclub.ca
