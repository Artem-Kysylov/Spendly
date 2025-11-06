import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { locale } = await req.json().catch(() => ({ locale: 'en' }))

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY
    const storeId = Number(process.env.LEMON_SQUEEZY_STORE_ID)
    const variantId = Number(process.env.LEMON_SQUEEZY_PRO_VARIANT_ID)

    if (!apiKey || !storeId || !variantId) {
      return NextResponse.json({ error: 'Missing Lemon Squeezy env' }, { status: 500 })
    }

    // Строим redirect на страницу успеха с учётом origin и locale
    const origin = new URL(req.url).origin
    const redirectUrl = `${origin}/${locale}/checkout/success`

    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          store_id: storeId,
          variant_id: variantId,
          preview: true,
          redirect_url: redirectUrl
        }
      }
    }
    console.log('[Checkout API] request payload:', payload)

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'Checkout API failed', details: text }, { status: 500 })
    }

    const json = await res.json()
    const url = json?.data?.attributes?.url
    console.log('[Checkout API] response URL:', url)

    if (!url) {
      return NextResponse.json({ error: 'No URL in response' }, { status: 500 })
    }

    return NextResponse.json({ url }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error', details: err?.message }, { status: 500 })
  }
}