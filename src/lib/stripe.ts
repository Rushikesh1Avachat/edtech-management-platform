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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
    return 'http://localhost:3000';
  }

  return appUrl;
}
