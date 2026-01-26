"use client";

import { useState, useEffect, useCallback } from "react";
import { Branch, BranchRaw } from "@/types/branch";
import { transformBranches } from "@/lib/utils";

const BATCH_SIZE = 100;
const TOTAL_BRANCHES = 1000;

const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  "https://cg.optimizely.com/content/v2?auth=iQEyR1jR1cBG5mnLQoRotCyNmKUgaO0DT5cRbJPKA3oZGGQo";

const BRANCHES_QUERY = `
  query GetBranches($limit: Int!, $skip: Int!) {
    Branch(limit: $limit, skip: $skip) {
      total
      items {
        _id
        Name
        Street
        City
        Country
        CountryCode
        ZipCode
        Coordinates
        Phone
        Email
      }
    }
  }
`;

interface GraphQLResponse {
  data?: {
    Branch?: {
      total: number;
      items: BranchRaw[];
    };
  };
  errors?: Array<{ message: string }>;
}

async function fetchBranches(skip: number, limit: number): Promise<GraphQLResponse> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: BRANCHES_QUERY,
      variables: { limit, skip },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function useBranches() {
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  const loadAllBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadProgress(0);

      // First fetch to get total count
      const firstResult = await fetchBranches(0, BATCH_SIZE);

      if (firstResult.errors) {
        throw new Error(firstResult.errors[0]?.message || "GraphQL error");
      }

      if (!firstResult.data?.Branch) {
        throw new Error("No branch data received");
      }

      const total = firstResult.data.Branch.total || TOTAL_BRANCHES;
      const batches = Math.ceil(total / BATCH_SIZE);
      const allItems: Branch[] = [];

      // Process first batch
      const firstBatch = transformBranches(firstResult.data.Branch.items);
      allItems.push(...firstBatch);
      setLoadProgress(1 / batches);

      // Fetch remaining batches in parallel (groups of 3 for speed)
      const remainingBatches = [];
      for (let i = 1; i < batches; i++) {
        remainingBatches.push(i);
      }

      // Process in chunks of 3 parallel requests
      const chunkSize = 3;
      for (let i = 0; i < remainingBatches.length; i += chunkSize) {
        const chunk = remainingBatches.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map((batchIndex) => fetchBranches(batchIndex * BATCH_SIZE, BATCH_SIZE))
        );

        for (const result of results) {
          if (result.data?.Branch?.items) {
            const batch = transformBranches(result.data.Branch.items);
            allItems.push(...batch);
          }
        }

        setLoadProgress((i + chunk.length + 1) / batches);
      }

      setAllBranches(allItems);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load branches:", err);
      setError(err instanceof Error ? err : new Error("Failed to load branches"));
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllBranches();
  }, [loadAllBranches]);

  return {
    branches: allBranches,
    isLoading,
    error,
    loadProgress,
    refetch: loadAllBranches,
  };
}
