"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--midnight)]/95 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="font-[var(--font-playfair)] text-xl sm:text-2xl font-bold text-[var(--warm-white)] tracking-tight"
          >
            Brightstream
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#"
              className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal tracking-wide"
            >
              Personal
            </Link>
            <Link
              href="#"
              className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal tracking-wide"
            >
              Business
            </Link>
            <Link
              href="#"
              className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal tracking-wide"
            >
              Wealth
            </Link>
            <Link
              href="#"
              className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal tracking-wide"
            >
              About
            </Link>
            <Link
              href="/"
              className="text-[var(--gold)] text-sm font-medium tracking-wide"
            >
              Branch Finder
            </Link>
            <Link
              href="#"
              className="bg-[var(--gold)] text-[var(--midnight)] px-5 py-2 rounded-full text-sm font-medium hover:bg-[var(--warm-white)] transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[var(--cream)]"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--navy)]">
            <div className="flex flex-col gap-4">
              <Link
                href="#"
                className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal"
              >
                Personal
              </Link>
              <Link
                href="#"
                className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal"
              >
                Business
              </Link>
              <Link
                href="#"
                className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal"
              >
                Wealth
              </Link>
              <Link
                href="#"
                className="text-[var(--cream)] hover:text-[var(--gold)] text-sm font-normal"
              >
                About
              </Link>
              <Link
                href="/"
                className="text-[var(--gold)] text-sm font-medium"
              >
                Branch Finder
              </Link>
              <Link
                href="#"
                className="bg-[var(--gold)] text-[var(--midnight)] px-5 py-2 rounded-full text-sm font-medium text-center hover:bg-[var(--warm-white)]"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
