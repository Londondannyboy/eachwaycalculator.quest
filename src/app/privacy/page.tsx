import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-slate-300 text-lg mb-8">
            Last updated: January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-slate-300">
              Stamp Duty Calculator UK (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the website
              stampdutycalculator.quest. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you visit our website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-white mb-3">Information You Provide</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Account information (email address, name) if you create an account</li>
              <li>Property details entered into our calculators (not stored)</li>
              <li>Communication data if you contact us</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3">Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Usage patterns and page visits</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-300 mb-4">We use collected information to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Provide and maintain our stamp duty calculator services</li>
              <li>Improve and personalize your experience</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send administrative information and updates</li>
              <li>Analyze usage to improve our services</li>
              <li>Protect against fraudulent or illegal activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">4. Calculator Data</h2>
            <p className="text-slate-300">
              Property prices and other details you enter into our stamp duty calculators are
              processed locally in your browser or temporarily on our servers to provide
              calculations. We do not permanently store your property details or calculation
              results unless you explicitly save them to an account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">5. Cookies</h2>
            <p className="text-slate-300 mb-4">
              We use cookies and similar technologies to enhance your experience. These include:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li><strong>Essential cookies:</strong> Required for the website to function</li>
              <li><strong>Analytics cookies:</strong> Help us understand how visitors use our site</li>
              <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-slate-300 mt-4">
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">6. Third-Party Services</h2>
            <p className="text-slate-300 mb-4">We may use third-party services including:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Vercel (hosting and analytics)</li>
              <li>Authentication providers (for account features)</li>
              <li>AI assistants (for calculator support features)</li>
            </ul>
            <p className="text-slate-300 mt-4">
              These services may collect information as described in their respective privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">7. Data Security</h2>
            <p className="text-slate-300">
              We implement appropriate technical and organizational measures to protect your
              personal information. However, no method of transmission over the Internet is
              100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
            <p className="text-slate-300 mb-4">Under UK GDPR, you have the right to:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">9. Contact Us</h2>
            <p className="text-slate-300">
              If you have questions about this Privacy Policy or wish to exercise your rights,
              please contact us at:{" "}
              <Link href="/contact" className="text-blue-400 hover:text-blue-300">
                our contact page
              </Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
            <p className="text-slate-300">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the
              &quot;Last updated&quot; date.
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
