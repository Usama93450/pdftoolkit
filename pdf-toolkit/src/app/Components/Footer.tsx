import Link from "next/link";
import {
  FileText,
  ArrowUpRight,
  ShieldCheck,
  Home,
  Wrench,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";

export function Footer() {
 

  return (
    <footer className="relative overflow-hidden border-t border-gray-200 bg-white">
      {/* Subtle background accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-red-50/70 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Main footer */}
        <div className="grid gap-12 py-14 sm:py-16 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">

          {/* Brand */}
          <div className="lg:col-span-5">
            <Link
              href="/"
              aria-label="PDF Toolkit home"
              className="group inline-flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm shadow-red-600/20 transition-all duration-300 group-hover:bg-red-700 group-hover:shadow-md">
                <FileText size={23} strokeWidth={1.9} />
              </span>

              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                PDF<span className="text-red-600">Toolkit</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-gray-600">
              Make everyday document tasks simpler. Explore practical PDF
              tools designed to help you manage your documents with less effort.
            </p>

            <Link
              href="/#tools"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-red-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Explore PDF tools
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-900">
              Navigation
            </h3>

            <ul className="mt-5 space-y-4">
              <li>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-red-600"
                >
                  <Home size={16} />
                  Home
                </Link>
              </li>

              <li>
                <Link
                  href="/#tools"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-red-600"
                >
                  <Wrench size={16} />
                  All tools
                </Link>
              </li>

              <li>
                <Link
                  href="/#how-it-works"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-red-600"
                >
                  <ArrowUpRight size={16} />
                  How it works
                </Link>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-900">
              PDF Toolkit
            </h3>

            <ul className="mt-5 space-y-4">
              <li>
                <Link
                  href="/#tools"
                  className="text-sm text-gray-600 transition-colors hover:text-red-600"
                >
                  PDF tools
                </Link>
              </li>

              <li>
                <Link
                  href="/#how-it-works"
                  className="text-sm text-gray-600 transition-colors hover:text-red-600"
                >
                  Features
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & privacy */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold text-gray-900">
              Trust & privacy
            </h3>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors duration-200 hover:border-red-100 hover:bg-red-50/40">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <ShieldCheck size={19} />
                </span>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Your documents matter
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Learn about our approach to file handling and privacy.
                  </p>
                </div>
              </div>

              <Link
                href="/#privacy"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 transition-colors hover:text-red-700"
              >
                Privacy information
                <ArrowUpRight size={15} />
              </Link>

              <div className="mt-3 border-t border-gray-200 pt-3">
                <Link
                  href="/#privacy"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-red-600"
                >
                  <LockKeyhole size={15} />
                  Privacy notice
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-gray-200 py-6 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-xs leading-5 text-gray-500 sm:text-sm">
    © 2026 PDF Toolkit. All rights reserved.
  </p>

  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    <Link
      href="/#privacy"
      className="text-xs text-gray-500 transition-colors hover:text-red-600 sm:text-sm"
    >
      Privacy
    </Link>

    <Link
      href="/#tools"
      className="text-xs text-gray-500 transition-colors hover:text-red-600 sm:text-sm"
    >
      Explore tools
    </Link>

    <Link
      href="/"
      className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-red-600 sm:text-sm"
    >
      Back to home
      <ArrowUpRight size={14} />
    </Link>
  </div>
</div>
      </div>
    </footer>
  );
}
