import 'server-only'

// lib/payments.ts — All Lemon Squeezy API calls
// The frontend NEVER calls Lemon Squeezy directly.
// Checkout URL creation happens here, frontend just receives a URL string to redirect to.

const LEMON_SQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1'

interface CheckoutResponse {
  checkoutUrl: string
}

/**
 * Create a Lemon Squeezy checkout session.
 * Called by /api/payments/create-checkout route.
 * Returns a checkout URL that the frontend redirects to.
 */
export async function createCheckoutSession(
  variantId: string,
  workspaceId: string,
  userEmail: string,
  customerId?: string
): Promise<CheckoutResponse> {
  const response = await fetch(`${LEMON_SQUEEZY_API_URL}/checkouts`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            custom: {
              workspace_id: workspaceId,
            },
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://pulseloop.io' : 'http://localhost:3000'}/settings?payment=success`,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: process.env.LEMON_SQUEEZY_STORE_ID!,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Lemon Squeezy checkout creation failed:', errorBody)
    throw new Error('Failed to create checkout session')
  }

  const result = await response.json()
  return {
    checkoutUrl: result.data.attributes.url,
  }
}

/**
 * Get the internal plan name from a Lemon Squeezy variant ID.
 * Never trust the webhook body for plan names — always look up from variant ID.
 */
export function getVariantPlanMap(): Record<string, string> {
  return {
    [process.env.LS_VARIANT_STARTER!]: 'starter',
    [process.env.LS_VARIANT_PRO!]: 'pro',
    [process.env.LS_VARIANT_AGENCY!]: 'agency',
  }
}

/**
 * Get the variant ID for a specific plan (for creating checkout sessions).
 */
export function getPlanVariantId(plan: string): string | null {
  const map: Record<string, string | undefined> = {
    starter: process.env.LS_VARIANT_STARTER,
    pro: process.env.LS_VARIANT_PRO,
    agency: process.env.LS_VARIANT_AGENCY,
  }
  return map[plan] ?? null
}
