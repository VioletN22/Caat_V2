import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Contact Us · CAAT",
  description: "Get in touch with the CAAT team.",
};

const SUPPORT_EMAIL = "contact@purpl.au";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-black font-serif">
      {/* Top bar */}
      <header className="border-b border-black px-8 py-6 flex items-center justify-between max-w-6xl mx-auto">
        <Link
          href="/"
          className="flex items-center focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-black focus-visible:outline-offset-2"
        >
          <Image
            src="/logo.png"
            alt="CAAT"
            width={72}
            height={28}
            className="object-contain"
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-xs font-code tracking-wide text-[#525252] hover:text-black hover:underline"
        >
          ← Back to home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 lg:px-12 py-16 md:py-24">
        <div className="mb-12 border-b border-[#E5E5E5] pb-8">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[#525252] mb-4 font-code">
            Get in touch
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-none mb-4 font-display">
            Contact Us
          </h1>
          <p className="text-lg text-[#525252] font-serif max-w-xl">
            Questions, feedback, partnership ideas, privacy requests, we read
            every email.
          </p>
        </div>

        <section className="space-y-6">
          <div className="rounded-md border border-black p-8 bg-[#fafafa]">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[#525252] mb-3 font-code">
              Email
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-2xl md:text-3xl font-bold font-display text-black hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-black focus-visible:outline-offset-2"
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="text-sm text-[#525252] mt-3 font-serif">
              We aim to reply within two business days. For privacy or data
              requests, we respond within 30 days as required by the Australian
              Privacy Principles.
            </p>
            <div className="mt-6">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                style={{ backgroundColor: "#b81f2f", color: "#fff" }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-code tracking-wide hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#b81f2f] focus-visible:outline-offset-2"
              >
                Send us an email →
              </a>
            </div>
          </div>

          <div className="text-sm text-[#525252] font-serif space-y-2 pt-4">
            <p>
              <strong className="text-black">Operated by</strong> Purpl
              Solutions, a Sydney-based dev studio. CAAT is one of our products.{" "}
              <a
                href="https://purpl.au"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-black"
              >
                purpl.au
              </a>
            </p>
            <p>
              <strong className="text-black">Help articles</strong> are coming
              soon. In the meantime, email is the fastest way to reach us.
            </p>
          </div>
        </section>

        <div className="mt-16 pt-8 border-t border-[#E5E5E5] text-xs text-[#525252] font-code flex flex-wrap gap-4">
          <Link href="/privacy" className="hover:text-black hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-black hover:underline">
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}
