"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 px-[5%] py-6 flex justify-between items-center bg-[rgba(10,22,40,0.85)] backdrop-blur-[10px] shadow-[0_2px_20px_rgba(10,22,40,0.1)]">
      {/* Logo */}
      <Link
        href="/"
        className="font-['Playfair_Display',serif] text-[1.8rem] font-bold text-warm-white tracking-[-0.5px] no-underline"
      >
        Brightstream
      </Link>

      {/* Desktop Navigation */}
      <ul className="hidden md:flex gap-12 list-none items-center">
        <li>
          <Link href="#" className="nav-link">
            Personal
          </Link>
        </li>
        <li>
          <Link href="#" className="nav-link">
            Business
          </Link>
        </li>
        <li>
          <Link href="#" className="nav-link">
            Wealth
          </Link>
        </li>
        <li>
          <Link href="#" className="nav-link">
            About
          </Link>
        </li>
        <li>
          <Link
            href="/"
            className="nav-link !text-gold after:!bg-gold"
          >
            Branch Finder
          </Link>
        </li>
        <li>
          <Link href="#" className="btn-cta">
            Get Started
          </Link>
        </li>
      </ul>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 text-cream"
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[rgba(10,22,40,0.95)] backdrop-blur-[10px] py-6 px-[5%]">
          <div className="flex flex-col gap-4">
            <Link
              href="#"
              className="text-cream hover:text-gold text-[0.95rem] font-normal tracking-[0.5px] no-underline"
            >
              Personal
            </Link>
            <Link
              href="#"
              className="text-cream hover:text-gold text-[0.95rem] font-normal tracking-[0.5px] no-underline"
            >
              Business
            </Link>
            <Link
              href="#"
              className="text-cream hover:text-gold text-[0.95rem] font-normal tracking-[0.5px] no-underline"
            >
              Wealth
            </Link>
            <Link
              href="#"
              className="text-cream hover:text-gold text-[0.95rem] font-normal tracking-[0.5px] no-underline"
            >
              About
            </Link>
            <Link
              href="/"
              className="text-gold text-[0.95rem] font-medium tracking-[0.5px] no-underline"
            >
              Branch Finder
            </Link>
            <Link
              href="#"
              className="btn-cta text-center mt-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
