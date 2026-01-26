"use client";

import { Branch } from "@/types/branch";

interface BranchCardProps {
  branch: Branch;
  isSelected: boolean;
  onClick: () => void;
}

export default function BranchCard({ branch, isSelected, onClick }: BranchCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-[var(--midnight)] text-[var(--warm-white)] shadow-lg shadow-[var(--midnight)]/20"
          : "bg-[var(--cream)] hover:bg-white hover:shadow-lg hover:-translate-y-1"
      }`}
    >
      {/* Branch Name */}
      <h3
        className={`font-[var(--font-playfair)] text-lg font-semibold mb-2 ${
          isSelected ? "text-[var(--warm-white)]" : "text-[var(--midnight)]"
        }`}
      >
        {branch.Name}
      </h3>

      {/* Address */}
      <div className={`text-sm mb-3 ${isSelected ? "text-[var(--cream)]" : "text-[var(--slate)]"}`}>
        <p>{branch.Street}</p>
        <p>
          {branch.City}, {branch.ZipCode}
        </p>
        <p>{branch.Country}</p>
      </div>

      {/* Contact Info */}
      <div className="flex flex-col gap-2">
        {/* Phone */}
        <a
          href={`tel:${branch.Phone}`}
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-2 text-sm ${
            isSelected
              ? "text-[var(--gold)] hover:text-[var(--warm-white)]"
              : "text-[var(--deep-teal)] hover:text-[var(--midnight)]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <span>{branch.Phone}</span>
        </a>

        {/* Email */}
        <a
          href={`mailto:${branch.Email}`}
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-2 text-sm ${
            isSelected
              ? "text-[var(--gold)] hover:text-[var(--warm-white)]"
              : "text-[var(--deep-teal)] hover:text-[var(--midnight)]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="truncate">{branch.Email}</span>
        </a>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-[var(--navy)] flex items-center gap-2 text-[var(--gold)] text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
          </svg>
          <span>Viewing on map</span>
        </div>
      )}
    </div>
  );
}
