export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a href="/" className="text-xs text-zinc-600 hover:text-amber-500 transition-colors mb-8 inline-block">
          &larr; Back to KitsunePaint
        </a>

        <h1 className="text-2xl font-bold text-zinc-100 mb-8">Terms of Use & Privacy</h1>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">What KitsunePaint Does</h2>
            <p>
              KitsunePaint is a free tool that lets you create custom paint texture
              modpacks for 7 Days to Die. You upload texture images, configure your
              paints, and download a ready-to-install modlet. That's it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Your Data</h2>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>We do <strong className="text-zinc-200">not</strong> collect personal information</li>
              <li>We do <strong className="text-zinc-200">not</strong> use cookies or tracking scripts</li>
              <li>We do <strong className="text-zinc-200">not</strong> run analytics (no Google Analytics, no tracking pixels)</li>
              <li>We do <strong className="text-zinc-200">not</strong> require accounts or logins</li>
              <li>We do <strong className="text-zinc-200">not</strong> store your IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Uploaded Textures</h2>
            <p>
              When you build a modpack, your texture files are sent to our server
              for bundle processing. These files are <strong className="text-zinc-200">immediately deleted</strong> after
              the bundle is built and returned to you. We do not store, review, or
              redistribute your uploaded textures.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Build Counter</h2>
            <p>
              We keep an anonymous counter of how many modpacks have been created.
              Each entry logs only the paint name you chose, a timestamp, and the
              file size. No user-identifying information is included.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Your Modpacks</h2>
            <p>
              You own what you create. Modpacks you build with KitsunePaint are yours
              to use, share, or distribute however you like. We claim no rights over
              your textures or the modpacks generated from them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Acceptable Use</h2>
            <p>
              Don't use KitsunePaint to process, distribute, or create content that
              is illegal, infringing, or harmful. This includes but is not limited to
              copyrighted material you don't have rights to, illegal imagery, or
              content that violates the 7 Days to Die EULA. We reserve the right to
              block access to anyone misusing the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Open Source</h2>
            <p>
              KitsunePaint is open source. You can review exactly what the code does
              at{' '}
              <a href="https://github.com/Kitsune-Den/KitsunePaint" target="_blank" rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 transition-colors">
                github.com/Kitsune-Den/KitsunePaint
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Contact</h2>
            <p>
              Questions or concerns? Open an issue on{' '}
              <a href="https://github.com/Kitsune-Den/KitsunePaint/issues" target="_blank" rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 transition-colors">
                GitHub
              </a>.
            </p>
          </section>

          <p className="text-xs text-zinc-700 pt-4 border-t border-zinc-800/40">
            Last updated: April 2026
          </p>
        </div>
      </div>
    </div>
  )
}
