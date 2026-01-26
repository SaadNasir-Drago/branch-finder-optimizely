"use client";

import { Branch } from "@/types/branch";
import BranchCard from "./BranchCard";

interface BranchListProps {
  branches: Branch[];
  selectedBranch: Branch | null;
  onBranchSelect: (branch: Branch) => void;
  isLoading: boolean;
}

export default function BranchList({
  branches,
  selectedBranch,
  onBranchSelect,
  isLoading,
}: BranchListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
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

  if (branches.length === 0) {
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

  return (
    <div className="space-y-4 pr-2">
      {branches.map((branch) => (
        <BranchCard
          key={branch._id}
          branch={branch}
          isSelected={selectedBranch?._id === branch._id}
          onClick={() => onBranchSelect(branch)}
        />
      ))}
    </div>
  );
}
