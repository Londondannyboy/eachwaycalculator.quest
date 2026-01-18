"use client";

export function BetaBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <p className="text-center text-sm text-amber-200">
          <span className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">
              BETA
            </span>
            <span className="text-amber-300/90">
              This calculator is for informational purposes only and is not financial advice.
              Always consult{" "}
              <a
                href="https://www.gov.uk/stamp-duty-land-tax"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                HMRC
              </a>
              {" "}or a qualified professional before making financial decisions.
            </span>
          </span>
        </p>
      </div>
    </div>
  );
}

export default BetaBanner;
