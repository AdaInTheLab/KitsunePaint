/**
 * Pricing / paid tier page. KitsunePaint itself is free for the public
 * tool at paint.kitsuneden.net ~ this page is specifically for people
 * who want to call the bundle-build API from elsewhere (their own site,
 * a CLI, a server-to-server integration, etc).
 *
 * Pricing is "contact me" rather than fixed numbers because the volume
 * varies wildly per customer and Ada wants room to negotiate. Email
 * link goes to adainthelab@gmail.com (same as the 403 error message
 * the API returns when an unauthorized origin tries to POST).
 */

type PerkType = 'included' | 'excluded'
type Tier = {
  name: string
  tagline: string
  price: string
  cta: string
  ctaHref: string
  perks: { type: PerkType; text: string }[]
  highlight?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    tagline: 'For making your own paint packs',
    price: 'Always free',
    cta: 'Open the tool',
    ctaHref: '/app',
    perks: [
      { type: 'included', text: 'Unlimited paint packs from paint.kitsuneden.net' },
      { type: 'included', text: 'Crop tool, multi-block paints, PBR maps' },
      { type: 'included', text: 'Downloadable DIY kit for offline builds' },
      { type: 'included', text: 'No account, no signup, no tracking' },
      { type: 'excluded', text: 'Embedding the build API in your own site' },
      { type: 'excluded', text: 'Server-to-server / programmatic builds' },
    ],
  },
  {
    name: 'Whitelisted API',
    tagline: 'For integrators and heavy users',
    price: 'Email for pricing',
    cta: 'Contact Ada',
    ctaHref: 'mailto:adainthelab@gmail.com?subject=KitsunePaint%20Whitelisted%20API%20Access',
    highlight: true,
    perks: [
      { type: 'included', text: 'Personal API key (X-API-Key header)' },
      { type: 'included', text: 'Call the bundle-build API from anywhere' },
      { type: 'included', text: 'Server-to-server, custom CLIs, your own UI' },
      { type: 'included', text: 'Higher rate limits negotiated per use case' },
      { type: 'included', text: 'Direct line to me if something breaks' },
      { type: 'included', text: 'Key rotation / revocation on request' },
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <a href="/" className="text-xs text-zinc-600 hover:text-amber-500 transition-colors mb-8 inline-block">
          &larr; Back to KitsunePaint
        </a>

        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-zinc-100 mb-3">Pricing</h1>
          <p className="text-sm text-zinc-500 max-w-xl mx-auto">
            The tool itself is free for everyone. The paid tier is just for folks who
            want to call the bundle-build API from outside paint.kitsuneden.net ~
            integrators, modpack curators, custom UIs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                tier.highlight
                  ? 'bg-zinc-900 border-amber-500/30 shadow-2xl shadow-amber-900/10'
                  : 'bg-zinc-900/50 border-zinc-800'
              }`}
            >
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-1 ${tier.highlight ? 'text-amber-400' : 'text-zinc-200'}`}>
                  {tier.name}
                </h2>
                <p className="text-xs text-zinc-500">{tier.tagline}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-zinc-800/60">
                <p className={`text-2xl font-bold ${tier.highlight ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {tier.price}
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {tier.perks.map((perk, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span
                      className={`shrink-0 inline-block w-4 text-center ${
                        perk.type === 'included' ? 'text-emerald-500' : 'text-zinc-700'
                      }`}
                    >
                      {perk.type === 'included' ? '✓' : '×'}
                    </span>
                    <span className={perk.type === 'included' ? 'text-zinc-300' : 'text-zinc-600 line-through'}>
                      {perk.text}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.ctaHref}
                className={`block text-center py-3 rounded-lg text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        <section className="space-y-8 text-sm leading-relaxed">
          <div>
            <h3 className="text-base font-semibold text-zinc-200 mb-2">Why is the API gated?</h3>
            <p className="text-zinc-400">
              The bundle build is the only expensive part ~ each paint takes 30-60s of
              CPU time on the shared server. Letting any site embed it in their own JS
              would let them use my server budget instead of paying for their own. The
              whitelist keeps the free tier sustainable while still letting serious
              integrators get programmatic access for a fair price.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-200 mb-2">What counts as "integration"?</h3>
            <p className="text-zinc-400">
              Anything that isn't a person clicking buttons on paint.kitsuneden.net.
              That includes: a CLI you wrote, a script that bulk-generates packs, a
              custom web UI, calling from another website, a server-to-server pipeline.
              If the request comes from your own code instead of my frontend, you need
              a key.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-200 mb-2">What about the DIY kit?</h3>
            <p className="text-zinc-400">
              The downloadable DIY kit (link on the landing page) lets you build packs
              entirely offline, no API calls, no key needed. If you're a hobbyist who
              just wants to bulk-build for yourself, that's probably the right tool.
              The paid API is for cases where you need it baked into your own service.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-200 mb-2">Pricing details?</h3>
            <p className="text-zinc-400">
              Email{' '}
              <a href="mailto:adainthelab@gmail.com" className="text-amber-500 hover:text-amber-400 transition-colors">
                adainthelab@gmail.com
              </a>{' '}
              with what you're building, expected volume, and timeline. I'll quote
              based on real load. One-time setup fee + monthly works for most cases;
              one-off bulk projects negotiable.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
