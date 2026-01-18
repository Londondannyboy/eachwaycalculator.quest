import Link from "next/link";

const BETTING_RESOURCES = [
  { href: "https://www.begambleaware.org", label: "BeGambleAware", description: "Help with problem gambling" },
  { href: "https://www.gamcare.org.uk", label: "GamCare", description: "Support and counselling" },
  { href: "https://www.gamstop.co.uk", label: "GAMSTOP", description: "Self-exclusion service" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-900 text-zinc-400 mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-4">Each-Way Calculator</h3>
            <p className="text-sm mb-4">
              Free each-way bet calculator for horse racing, golf, and sports betting.
              Calculate your potential returns instantly with AI-powered assistance.
            </p>
            <p className="text-xs text-zinc-500">
              This calculator provides estimates only. Always check your bookmaker's
              specific terms and conditions before placing bets.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Responsible Gambling</h3>
            <ul className="space-y-3">
              {BETTING_RESOURCES.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors text-sm flex items-start gap-2"
                  >
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <div>
                      <span className="block">{link.label}</span>
                      <span className="text-xs text-zinc-500">{link.description}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">Important Information</h3>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-amber-400 font-medium">18+ Only</span> - Gambling is
                for adults only. You must be 18 or over to bet in the UK.
              </p>
              <p>
                <span className="text-emerald-400 font-medium">Gamble Responsibly</span> - Only
                bet what you can afford to lose. Never chase losses.
              </p>
              <p>
                <span className="text-blue-400 font-medium">Need Help?</span> - If gambling
                is affecting you or someone you know, please seek support.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-8 pt-8 border-t border-zinc-800">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
            <span>Standard UK betting terms used</span>
            <span>•</span>
            <span>Calculations based on industry standards</span>
            <span>•</span>
            <span>Always check your bookmaker&apos;s terms</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs">
              © {currentYear} Each-Way Calculator. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
