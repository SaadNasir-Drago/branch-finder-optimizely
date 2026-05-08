"use client";

import { useEffect, useRef, useState } from "react";
import { Branch } from "@/types/branch";
import { formatDistance } from "@/lib/utils";

interface BranchDetailPanelProps {
  branch: Branch | null;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
  onGetDirections?: (branch: Branch) => void;
}

export default function BranchDetailPanel({
  branch,
  onClose,
  onGetDirections,
}: BranchDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">("idle");
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!branch) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [branch, onClose]);

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    };
  }, []);

  if (!branch) return null;

  const handleGetDirections = () => {
    if (onGetDirections) {
      onGetDirections(branch);
      onClose();
    }
  };

  const flashShareStatus = (status: "copied" | "shared") => {
    setShareStatus(status);
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    shareTimeoutRef.current = setTimeout(() => setShareStatus("idle"), 1800);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashShareStatus("copied");
    } catch {
      // Clipboard blocked (e.g. insecure context) — leave status idle.
    }
  };

  const handleShare = async () => {
    // Build a filter URL (country + city + search) so opening the link runs
    // through the normal filter pipeline and narrows the list to this branch.
    // Using the unique `_id` via `?branch=` was unreliable, so we filter
    // instead — country + city + name nearly always isolates a single branch.
    const params = new URLSearchParams();
    if (branch.CountryCode) params.set("country", branch.CountryCode);
    if (branch.City) params.set("city", branch.City);
    params.set("q", branch.Name);
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${branch.Name} - Brightstream Bank`,
          url: shareUrl,
        });
        flashShareStatus("shared");
      } catch {
        await copyToClipboard(shareUrl);
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-9999"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-detail-title"
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-10000 flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="bg-linear-to-br from-midnight via-navy to-deep-teal p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Share branch"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              {shareStatus !== "idle" && (
                <span
                  role="status"
                  aria-live="polite"
                  className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-gold px-2 py-1 text-xs font-medium text-midnight shadow-md"
                >
                  {shareStatus === "copied" ? "Link copied!" : "Shared!"}
                </span>
              )}
            </div>
          </div>

          <h2
            id="branch-detail-title"
            className="font-(family-name:--font-playfair) text-2xl font-bold mb-2"
          >
            {branch.Name}
          </h2>

          {branch.distance !== undefined && (
            <div className="inline-flex items-center gap-2 bg-gold text-midnight px-3 py-1.5 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {formatDistance(branch.distance)} away
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Address Section */}
          <div>
            <h3 className="text-sm font-medium text-slate uppercase tracking-wide mb-3">
              Address
            </h3>
            <div className="text-midnight space-y-1">
              <p className="font-medium">{branch.Street}</p>
              <p>{branch.City}, {branch.ZipCode}</p>
              <p>{branch.Country}</p>
            </div>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-sm font-medium text-slate uppercase tracking-wide mb-3">
              Contact
            </h3>
            <div className="space-y-3">
              <a
                href={`tel:${branch.Phone}`}
                className="flex items-center gap-3 p-3 bg-cream rounded-xl hover:bg-cream/70 transition-colors group"
              >
                <div className="w-10 h-10 bg-deep-teal text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate">Phone</p>
                  <p className="font-medium text-midnight">{branch.Phone}</p>
                </div>
              </a>

              <a
                href={`mailto:${branch.Email}`}
                className="flex items-center gap-3 p-3 bg-cream rounded-xl hover:bg-cream/70 transition-colors group"
              >
                <div className="w-10 h-10 bg-deep-teal text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate">Email</p>
                  <p className="font-medium text-midnight break-all">{branch.Email}</p>
                </div>
              </a>
            </div>
          </div>

          {/* Coordinates (for reference) */}
          <div>
            <h3 className="text-sm font-medium text-slate uppercase tracking-wide mb-3">
              Coordinates
            </h3>
            <p className="text-sm text-slate font-mono">
              {branch.lat.toFixed(6)}, {branch.lng.toFixed(6)}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-cream bg-warm-white">
          <button
            onClick={handleGetDirections}
            aria-label={`Get directions to ${branch.Name}`}
            className="w-full flex items-center justify-center gap-2 bg-gold text-midnight py-4 px-6 rounded-xl font-medium hover:bg-gold/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Get Directions
          </button>
        </div>
      </div>
    </>
  );
}
