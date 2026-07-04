import Image from "next/image";
import Link from "next/link";

// Lightweight header + footer for the logged-out public scholarship directory.
// These pages render under the root layout (no app sidebar), so they carry
// their own branded chrome and a clear path into the signup funnel.

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-black">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            aria-label="CAAT home"
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

          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm tracking-wide text-black hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-black focus-visible:outline-offset-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-[#9a1a27] text-white text-xs tracking-widest uppercase px-6 py-2.5 border border-[#9a1a27] rounded-md hover:bg-white hover:text-[#9a1a27] transition-colors duration-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#9a1a27] focus-visible:outline-offset-2 font-code"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const links = [
    { label: "Browse scholarships", href: "/scholarship" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact Us", href: "/contact" },
    { label: "Help Center", href: "/help" },
  ];

  return (
    <footer className="py-12 md:py-16 bg-white border-t border-black">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
          <div>
            <Image
              src="/logo.png"
              alt="CAAT"
              width={72}
              height={28}
              className="object-contain mb-3"
            />
            <p className="text-sm text-[#525252] max-w-xs font-serif">
              College Application Assistance Tool. Your path to an Australian
              university, organized.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-6">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-[#525252] hover:text-black hover:underline transition-colors duration-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-black focus-visible:outline-offset-2"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-[#E5E5E5]">
          <p className="text-[11px] text-[#525252] font-code">
            © {new Date().getFullYear()} CAAT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
