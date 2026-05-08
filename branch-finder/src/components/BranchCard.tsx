"use client";

import { memo } from "react";
import { Branch } from "@/types/branch";
import { formatDistance } from "@/lib/utils";

interface BranchCardProps {
  branch: Branch;
  isSelected: boolean;
  onSelect: (branch: Branch) => void;
  onGetDirections?: (branch: Branch) => void;
  onViewDetails?: (branch: Branch) => void;
}

function BranchCardImpl({ branch, isSelected, onSelect, onGetDirections, onViewDetails }: BranchCardProps) {
  const handleSelect = () => onSelect(branch);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(branch);
    }
  };

  const handleGetDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGetDirections) {
      onGetDirections(branch);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(branch);
    }
  };

  return (
    <div
      id={`branch-${branch._id}`}
      role="option"
      aria-selected={isSelected}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
        isSelected
          ? "bg-[var(--midnight)] text-[var(--warm-white)] shadow-lg shadow-[var(--midnight)]/20 border-[var(--midnight)]"
          : "bg-[var(--cream)] hover:bg-white hover:shadow-lg hover:-translate-y-1 border-[var(--slate)]/20"
      }`}
    >
      {/* Header with Name and Distance */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3
          className={`font-[var(--font-playfair)] text-lg font-semibold ${
            isSelected ? "text-[var(--warm-white)]" : "text-[var(--midnight)]"
          }`}
        >
          {branch.Name}
        </h3>
        {branch.distance !== undefined && (
          <span
            className={`text-sm font-medium whitespace-nowrap px-2 py-0.5 rounded-full ${
              isSelected
                ? "bg-[var(--gold)] text-[var(--midnight)]"
                : "bg-[var(--deep-teal)] text-white"
            }`}
          >
            {formatDistance(branch.distance)}
          </span>
        )}
      </div>

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

      {/* Actions Row */}
      <div className="mt-3 pt-3 border-t border-[var(--cream)] flex items-center justify-between gap-2">
        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={handleViewDetails}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isSelected
                ? "bg-[var(--warm-white)]/20 text-[var(--warm-white)] hover:bg-[var(--warm-white)]/30"
                : "bg-white text-[var(--midnight)] border border-[var(--midnight)]/15 hover:bg-[var(--cream)]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Details
          </button>
        )}

        {/* Get Directions Button */}
        {onGetDirections && (
          <button
            onClick={handleGetDirections}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isSelected
                ? "bg-[var(--gold)] text-[var(--midnight)] hover:bg-[var(--cream)]"
                : "bg-[var(--midnight)] text-white hover:bg-[var(--navy)]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Directions
          </button>
        )}
      </div>
    </div>
  );
}

const BranchCard = memo(BranchCardImpl);
export default BranchCard;
