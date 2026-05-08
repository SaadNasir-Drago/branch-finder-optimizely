"use client";

import { memo, useEffect } from "react";
import { Branch } from "@/types/branch";
import BranchCard from "./BranchCard";

interface BranchListProps {
  branches: Branch[];
  selectedBranch: Branch | null;
  onBranchSelect: (branch: Branch) => void;
  onBranchDetails?: (branch: Branch) => void;
  onGetDirections?: (branch: Branch) => void;
  isLoading: boolean;
}

function BranchListImpl({
  branches,
  selectedBranch,
  onBranchSelect,
  onBranchDetails,
  onGetDirections,
  isLoading,
}: BranchListProps) {
  // Scroll the selected card into view (covers deep-link selections that
  // arrive after the list has rendered scrolled to top).
  useEffect(() => {
    if (!selectedBranch) return;
    const el = document.getElementById(`branch-${selectedBranch._id}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedBranch]);

  // Show skeleton while loading and there's nothing to display yet.
  // Once partial branches stream in we show those (better than skeleton).
  if (isLoading && branches.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[var(--cream)] animate-pulse"
          >
            <div className="h-6 w-3/4 bg-[var(--slate)]/20 rounded mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-[var(--slate)]/20 rounded"></div>
              <div className="h-4 w-2/3 bg-[var(--slate)]/20 rounded"></div>
              <div className="h-4 w-1/2 bg-[var(--slate)]/20 rounded"></div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-1/2 bg-[var(--slate)]/20 rounded"></div>
              <div className="h-4 w-2/3 bg-[var(--slate)]/20 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 bg-[var(--cream)] rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-[var(--slate)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="font-[var(--font-playfair)] text-xl font-semibold text-[var(--midnight)] mb-2">
          No branches found
        </h3>
        <p className="text-[var(--slate)] max-w-sm">
          We couldn&apos;t find any branches matching your search. Try adjusting
          your filters or search terms.
        </p>
      </div>
    );
  }

  const selectedIndex = selectedBranch
    ? branches.findIndex((b) => b._id === selectedBranch._id)
    : -1;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (branches.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const direction = e.key === "ArrowDown" ? 1 : -1;
      const startIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIndex = Math.max(0, Math.min(branches.length - 1, startIndex + direction));
      const next = branches[nextIndex];
      if (next) onBranchSelect(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      onBranchSelect(branches[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onBranchSelect(branches[branches.length - 1]);
    }
  };

  return (
    <div
      role="listbox"
      aria-label="Branch results"
      aria-activedescendant={selectedBranch ? `branch-${selectedBranch._id}` : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-4 pr-2 pb-4 outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md"
    >
      {branches.map((branch) => (
        <BranchCard
          key={branch._id}
          branch={branch}
          isSelected={selectedBranch?._id === branch._id}
          onSelect={onBranchSelect}
          onGetDirections={onGetDirections}
          onViewDetails={onBranchDetails}
        />
      ))}
    </div>
  );
}

const BranchList = memo(BranchListImpl);
export default BranchList;
