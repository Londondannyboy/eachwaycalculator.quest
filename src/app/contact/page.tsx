import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
        <p className="text-slate-400 text-lg mb-12">
          Have questions about stamp duty or feedback about our calculator? We&apos;re here to help.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* AI Assistant Card */}
          <div className="gradient-card rounded-2xl p-8">
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Ask Our AI Assistant</h2>
            <p className="text-slate-400 mb-6">
              For stamp duty questions, try our AI-powered assistant. Available 24/7 on every
              calculator page - just use the chat sidebar on the right.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
            >
              Go to Calculator
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Official Resources Card */}
          <div className="gradient-card rounded-2xl p-8">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Official Tax Guidance</h2>
            <p className="text-slate-400 mb-6">
              For official SDLT guidance, contact HMRC directly or visit their website.
              They can answer questions about your specific tax situation.
            </p>
            <a
              href="https://www.gov.uk/stamp-duty-land-tax"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
            >
              Visit GOV.UK
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Common Questions</h2>
          <div className="space-y-4">
            <details className="gradient-card rounded-xl group">
              <summary className="flex justify-between items-center cursor-pointer p-5 font-medium text-white">
                Is this calculator accurate?
                <span className="ml-2 transition-transform group-open:rotate-180 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 border-t border-slate-700/50 pt-4">
                Our calculator uses the latest HMRC, Revenue Scotland, and Welsh Revenue Authority rates.
                While we strive for accuracy, calculations are estimates only. Always verify with a
                professional before making purchase decisions.
              </div>
            </details>

            <details className="gradient-card rounded-xl group">
              <summary className="flex justify-between items-center cursor-pointer p-5 font-medium text-white">
                Can I save my calculations?
                <span className="ml-2 transition-transform group-open:rotate-180 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 border-t border-slate-700/50 pt-4">
                You can create a free account to save your calculations and access them later.
                Sign in using the button in the top right corner of any page.
              </div>
            </details>

            <details className="gradient-card rounded-xl group">
              <summary className="flex justify-between items-center cursor-pointer p-5 font-medium text-white">
                Is this website free to use?
                <span className="ml-2 transition-transform group-open:rotate-180 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 border-t border-slate-700/50 pt-4">
                Yes! Our stamp duty calculators are completely free to use, with no hidden charges.
                We provide this service to help UK property buyers understand their tax obligations.
              </div>
            </details>

            <details className="gradient-card rounded-xl group">
              <summary className="flex justify-between items-center cursor-pointer p-5 font-medium text-white">
                Found a bug or have a suggestion?
                <span className="ml-2 transition-transform group-open:rotate-180 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 border-t border-slate-700/50 pt-4">
                We appreciate your feedback! If you&apos;ve found an issue or have suggestions for improvement,
                please let us know through our AI assistant or try again later - we regularly update
                our calculators based on user feedback.
              </div>
            </details>
          </div>
        </section>

        {/* Important Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-12">
          <h3 className="text-lg font-bold text-amber-400 mb-3">Important Notice</h3>
          <p className="text-slate-300">
            We cannot provide personalized tax advice. For questions about your specific
            circumstances, please consult a qualified solicitor, conveyancer, or tax advisor.
            Our calculator provides estimates only and should not be relied upon for making
            financial decisions.
          </p>
        </div>

        {/* Official Resources */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Official Resources</h2>
          <div className="gradient-card rounded-2xl divide-y divide-slate-700/50">
            {[
              {
                href: "https://www.gov.uk/stamp-duty-land-tax",
                label: "HMRC - Stamp Duty Land Tax",
                desc: "Official SDLT guidance for England & Northern Ireland",
              },
              {
                href: "https://revenue.scot/taxes/land-buildings-transaction-tax",
                label: "Revenue Scotland - LBTT",
                desc: "Official LBTT guidance for Scotland",
              },
              {
                href: "https://www.gov.wales/land-transaction-tax-guide",
                label: "Welsh Revenue Authority - LTT",
                desc: "Official LTT guidance for Wales",
              },
            ].map((link, index) => (
              <a
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 hover:bg-blue-500/5 transition-colors group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-sm text-slate-400">{link.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="pt-8 border-t border-slate-700">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Calculator
          </Link>
        </div>
      </div>
    </div>
  );
}
