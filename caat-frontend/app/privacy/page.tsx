import Link from "next/link";
import Image from "next/image";

const LAST_UPDATED = "May 2026";

export const metadata = {
  title: "Privacy Policy · CAAT",
  description:
    "How CAAT (a Purpl Solutions product) collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
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
        {/* Title */}
        <div className="mb-12 border-b border-[#E5E5E5] pb-8">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[#525252] mb-4 font-code">
            Legal
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-none mb-4 font-display">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#525252] font-code">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-10 text-[#333] leading-relaxed">
          <Section title="Who we are">
            <p>
              CAAT (College Application Assistance Tool) is a product operated
              under the brand <strong>Purpl Solutions</strong>, currently run as
              a sole trader by Violet Mynn Nwe in Sydney, Australia. References
              to &quot;we&quot;, &quot;us&quot;, and &quot;our&quot; in this
              policy mean Purpl Solutions.
            </p>
            <p>
              This policy covers the CAAT website, web app, and any related
              services we run. It does not cover third-party sites we link to,
              even if they look connected.
            </p>
            <p>
              For any privacy questions, you can reach us at{" "}
              <a
                href="mailto:contact@purpl.au"
                className="underline hover:text-black"
              >
                contact@purpl.au
              </a>
              . We respond within 30 days, the limit set by the Australian
              Privacy Principles.
            </p>
          </Section>

          <Section title="What we collect">
            <p>We only collect what we need to run CAAT:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Account information.</strong> Your email address, name,
                and a hashed password when you sign up. If you sign in with
                Google, we receive your email and name from Google.
              </li>
              <li>
                <strong>Profile information you choose to add.</strong> High
                school, graduation year, target colleges, intended majors,
                scholarships you bookmark, and resume content you build inside
                CAAT.
              </li>
              <li>
                <strong>Application data.</strong> The colleges you track, the
                status of each application, deadlines, notes you write, and
                essays you draft inside our editor.
              </li>
              <li>
                <strong>AI feature inputs.</strong> When you use ChatCAAT, AI
                Essay Review, or AI Resume Review, the text you submit is sent
                to our AI provider so it can generate a response. See &quot;AI
                features&quot; below for what happens to that text.
              </li>
              <li>
                <strong>Payment information (Pro subscribers only).</strong> If
                you upgrade to CAAT Pro, our payment processor (Stripe) handles
                your card details. We never see or store your full card number,
                only the metadata Stripe sends back.
              </li>
              <li>
                <strong>Usage and device data.</strong> Browser type,
                approximate location based on IP, pages you visit, and actions
                you take inside CAAT. We use this to understand which features
                are working and to fix bugs.
              </li>
              <li>
                <strong>Cookies.</strong> Small files in your browser that keep
                you signed in and remember basic preferences. We do not use
                third-party advertising or tracking cookies.
              </li>
            </ul>
          </Section>

          <Section title="Why we collect it">
            <ul className="list-disc space-y-2 pl-5">
              <li>To create your account and let you sign in.</li>
              <li>
                To deliver the features you use: tracking applications, drafting
                essays, building a resume, getting AI feedback, joining the CAAT
                Communities feed.
              </li>
              <li>
                To process payments and manage subscriptions for CAAT Pro users.
              </li>
              <li>
                To send you product emails (account confirmations, password
                resets, occasional updates). You can opt out of non-essential
                emails any time.
              </li>
              <li>To keep the service secure and detect abuse.</li>
              <li>
                To improve CAAT based on aggregated, non-identifying usage
                patterns.
              </li>
            </ul>
          </Section>

          <Section title="AI features and how Anthropic handles your data">
            <p>
              CAAT&apos;s AI features (ChatCAAT, AI Essay Review, AI Resume
              Review) are powered by Anthropic&apos;s Claude API. When you
              submit a prompt or essay for AI feedback:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                The text is sent over an encrypted connection to Anthropic so
                Claude can generate a response.
              </li>
              <li>
                Anthropic does not use API customer data to train its models.
                This is part of their{" "}
                <a
                  href="https://www.anthropic.com/legal/commercial-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-black"
                >
                  Commercial Terms
                </a>
                .
              </li>
              <li>
                Anthropic temporarily retains API inputs and outputs for up to
                30 days for safety and abuse-prevention purposes, then deletes
                them.
              </li>
              <li>
                We may also store the text inside your CAAT account so you can
                come back to it later. You can delete any saved essay, chat, or
                resume from within CAAT at any time.
              </li>
            </ul>
            <p className="mt-3">
              If you do not want a particular essay processed by AI, simply do
              not submit it to an AI feature. Drafts you keep in your private
              workspace are not sent anywhere outside CAAT.
            </p>
          </Section>

          <Section title="Who we share data with">
            <p>We share data only with the providers we need to run CAAT:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Anthropic</strong> for AI features, as described above.
              </li>
              <li>
                <strong>Vercel</strong> for hosting and serving the CAAT
                website.
              </li>
              <li>
                <strong>Supabase</strong> for storing your account and
                application data.
              </li>
              <li>
                <strong>Stripe</strong> for processing CAAT Pro subscriptions.
              </li>
              <li>
                <strong>Our transactional email provider</strong> for sending
                account confirmations and password resets.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell your data, ever. We do not share it with
              advertisers or data brokers. If we ever need to share data with a
              new provider, we&apos;ll update this policy and tell existing
              users.
            </p>
            <p>
              We may disclose information if legally required (court order,
              subpoena), or if we genuinely believe it is necessary to prevent
              serious harm.
            </p>
          </Section>

          <Section title="How long we keep your data">
            <p>
              We keep your account data while your account is active. If you
              delete your account, we delete the personal data associated with
              it within 30 days, except where we are legally required to keep
              certain records (for example, payment records for tax purposes).
              Anonymised analytics may be retained beyond that.
            </p>
          </Section>

          <Section title="Your rights">
            <p>You can, at any time:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Access the personal data we hold about you.</li>
              <li>Correct anything that is wrong.</li>
              <li>Export your data in a portable format.</li>
              <li>Delete your account and the data tied to it.</li>
              <li>Withdraw consent for non-essential processing.</li>
              <li>
                Lodge a complaint with the Office of the Australian Information
                Commissioner if you think we have mishandled your data.
              </li>
            </ul>
            <p className="mt-3">
              Email{" "}
              <a
                href="mailto:contact@purpl.au"
                className="underline hover:text-black"
              >
                contact@purpl.au
              </a>{" "}
              and we&apos;ll handle it.
            </p>
          </Section>

          <Section title="Users under 18">
            <p>
              CAAT is built for high school students working on college
              applications, so most of our users are under 18. By signing up,
              you confirm you are at least 13 years old. If you are under 13,
              please do not create an account, and ask a parent or guardian to
              contact us if they want a CAAT account on your behalf.
            </p>
            <p>
              We collect the minimum information needed to run the product.
              Parents or guardians who want to review or delete a minor&apos;s
              data can contact us at the email above.
            </p>
          </Section>

          <Section title="International users">
            <p>
              CAAT is operated from Australia. If you access CAAT from outside
              Australia, your data may be processed in Australia, the United
              States (Anthropic, Vercel, Stripe), or wherever our service
              providers operate. We rely on the standard contractual clauses and
              the privacy commitments published by each of those providers.
            </p>
            <p>
              If you are in the European Economic Area, the United Kingdom, or
              California, you have additional rights under the GDPR, UK GDPR, or
              CCPA respectively. Email us and we will honour them.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We use industry-standard practices to protect your data:
              encryption in transit (HTTPS), encryption at rest on our database
              provider, hashed passwords, and access controls so only the people
              who need to look at production data can. No system is perfectly
              secure, but we will tell affected users promptly if something
              serious happens.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we change this policy in a meaningful way, we&apos;ll update
              the &quot;Last updated&quot; date above and, for active users,
              send you a heads-up by email. Small wording fixes will not trigger
              a notification.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, complaints, or data requests:{" "}
              <a
                href="mailto:contact@purpl.au"
                className="underline hover:text-black"
              >
                contact@purpl.au
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-[#E5E5E5] text-xs text-[#525252] font-code">
          <Link href="/terms" className="hover:text-black hover:underline">
            Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold font-display mb-3 text-black">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
