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
┌─────────────────────┐
│  OnSite Calculator  │
│  (Mobile App)       │
└──────────┬──────────┘
           │ User clicks "Upgrade"
           ▼
┌─────────────────────────────────────┐
│  auth.onsiteclub.ca/checkout/calculator  │
│  (This App)                              │
└──────────┬──────────────────────────────┘
           │ Checks authentication
           │ Creates Stripe session
           ▼
┌─────────────────────┐
│  Stripe Checkout    │
│  (Payment Page)     │
└──────────┬──────────┘
           │ Payment completed
           ▼
┌─────────────────────────────────────┐
│  Stripe Webhook                          │
│  → auth.onsiteclub.ca/api/webhooks/stripe │
└──────────┬──────────────────────────────┘
           │ Saves subscription to Supabase
           ▼
┌─────────────────────┐
│  Success Page       │
│  User returns to app│
└─────────────────────┘
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

### `/app/checkout/[app]/page.tsx`
Dynamic route that:
1. Validates app name (calculator, timekeeper)
2. Checks if user is authenticated
3. Creates Stripe checkout session
4. Redirects to Stripe

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

### OnSite Calculator (Mobile App)

**To redirect user to checkout:**
```javascript
const checkoutUrl = 'https://auth.onsiteclub.ca/checkout/calculator';
// Open in browser or WebView
Linking.openURL(checkoutUrl);
```

**To check subscription status:**
```javascript
// Call your backend, which calls Supabase
const { data } = await supabase
  .from('subscriptions')
  .select('status')
  .eq('user_id', userId)
  .eq('app', 'calculator')
  .single();

const hasAccess = data?.status === 'active' || data?.status === 'trialing';
```

### OnSite Timekeeper (Mobile App)

Same as above, but use:
- Checkout URL: `https://auth.onsiteclub.ca/checkout/timekeeper`
- App filter: `.eq('app', 'timekeeper')`

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

---

## Troubleshooting

### Checkout Error
1. Check Vercel Logs for error message
2. Verify `STRIPE_PRICE_*` environment variable is set
3. Verify Stripe API keys are correct
4. Check if product/price exists in Stripe

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
