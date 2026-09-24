export function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() || '';

  if (!key || key.startsWith('sk_test_REPLACE')) {
    return {
      key: '',
      error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your project root .env file, then restart npm run dev.',
    };
  }

  if (!key.startsWith('sk_')) {
    return {
      key: '',
      error: 'STRIPE_SECRET_KEY must be a Stripe secret key that starts with sk_test_ or sk_live_.',
    };
  }

  return { key, error: null };
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';

  if (!secret || secret.startsWith('whsec_REPLACE')) {
    return {
      secret: '',
      error: 'Stripe webhook secret is not configured. Add STRIPE_WEBHOOK_SECRET to your project root .env file.',
    };
  }

  if (!secret.startsWith('whsec_')) {
    return {
      secret: '',
      error: 'STRIPE_WEBHOOK_SECRET must start with whsec_. Remove extra spaces or Markdown formatting from the value.',
    };
  }

  return { secret, error: null };
}

export function getAppUrl() {
  // Priority:
  // 1. NEXT_PUBLIC_APP_URL env var (explicit)
  // 2. NEXT_PUBLIC_VERCEL_URL env var (optional)
  // 3. VERCEL_URL (provided by Vercel runtime)
  // 4. If running in production, use the deployed Vercel URL for this project
  // 5. Fallback to localhost for development

  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    if (explicit.startsWith('http://') || explicit.startsWith('https://')) return explicit;
    return `https://${explicit}`;
  }

  const nextPublicVercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (nextPublicVercel) {
    if (nextPublicVercel.startsWith('http://') || nextPublicVercel.startsWith('https://')) return nextPublicVercel;
    return `https://${nextPublicVercel}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  // Default production URL for this deployed instance (Vercel)
  if (process.env.NODE_ENV === 'production') {
    return 'https://edtech-management-platform-8bp99i9i0.vercel.app';
  }

  // Local development fallback
  return 'http://localhost:3000';
}
