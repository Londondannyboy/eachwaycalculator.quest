import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Use</h1>

        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-slate-300 text-lg mb-8">
            Last updated: January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-300">
              By accessing and using Stamp Duty Calculator UK (stampdutycalculator.quest), you
              accept and agree to be bound by these Terms of Use. If you do not agree to these
              terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Services</h2>
            <p className="text-slate-300">
              Our website provides free stamp duty calculators for UK property purchases,
              including SDLT (England & Northern Ireland), LBTT (Scotland), and LTT (Wales).
              We also provide an AI-powered assistant to help answer stamp duty questions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">3. Disclaimer - Not Professional Advice</h2>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-4">
              <p className="text-amber-300 font-semibold mb-2">Important Notice</p>
              <p className="text-slate-300">
                The calculators and information provided on this website are for general
                informational purposes only. They do not constitute professional tax, legal,
                or financial advice. While we strive to keep information accurate and up-to-date,
                tax rules and rates can change without notice.
              </p>
            </div>
            <p className="text-slate-300">
              You should always consult with a qualified solicitor, conveyancer, accountant,
              or tax professional before making any property purchase decisions. We accept no
              liability for decisions made based on information provided by our calculators
              or AI assistant.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">4. Accuracy of Calculations</h2>
            <p className="text-slate-300">
              Our calculators are designed to provide estimates based on current published
              HMRC, Revenue Scotland, and Welsh Revenue Authority rates. However:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mt-4">
              <li>Calculations are estimates only and may not account for all circumstances</li>
              <li>Complex transactions may require specialist calculations</li>
              <li>Rates and thresholds may change - always verify with official sources</li>
              <li>Special reliefs and exemptions may apply to your situation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">5. AI Assistant Limitations</h2>
            <p className="text-slate-300">
              Our AI assistant is designed to help answer general stamp duty questions.
              While it strives to be accurate, it may occasionally provide incorrect or
              outdated information. The AI assistant does not have access to your personal
              circumstances and cannot provide personalized tax advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">6. User Responsibilities</h2>
            <p className="text-slate-300 mb-4">When using our services, you agree to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Provide accurate information when using our calculators</li>
              <li>Verify calculations with official sources before making decisions</li>
              <li>Seek professional advice for your specific circumstances</li>
              <li>Not use our services for any unlawful purpose</li>
              <li>Not attempt to interfere with or disrupt our services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
            <p className="text-slate-300">
              All content on this website, including text, graphics, logos, and software,
              is the property of Stamp Duty Calculator UK or its licensors and is protected
              by copyright and other intellectual property laws. You may not reproduce,
              distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">8. External Links</h2>
            <p className="text-slate-300">
              Our website contains links to external websites, including government resources
              (GOV.UK, Revenue Scotland, Welsh Revenue Authority). We are not responsible for
              the content or accuracy of these external sites. These links are provided for
              convenience and do not signify endorsement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
            <p className="text-slate-300">
              To the fullest extent permitted by law, Stamp Duty Calculator UK shall not be
              liable for any direct, indirect, incidental, special, consequential, or punitive
              damages arising from your use of our services or reliance on information provided.
              This includes any errors or omissions in calculations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">10. Indemnification</h2>
            <p className="text-slate-300">
              You agree to indemnify and hold harmless Stamp Duty Calculator UK from any
              claims, losses, or damages arising from your use of our services or violation
              of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
            <p className="text-slate-300">
              We reserve the right to modify these Terms of Use at any time. Changes will be
              effective immediately upon posting. Your continued use of our services after
              changes are posted constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law</h2>
            <p className="text-slate-300">
              These Terms of Use are governed by the laws of England and Wales. Any disputes
              shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact</h2>
            <p className="text-slate-300">
              For questions about these Terms of Use, please visit our{" "}
              <Link href="/contact" className="text-blue-400 hover:text-blue-300">
                contact page
              </Link>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-700">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Calculator
          </Link>
        </div>
      </div>
    </div>
  );
}
