"use client";

import { useState, useEffect, useCallback } from "react";
import { Branch, BranchRaw } from "@/types/branch";
import { transformBranches } from "@/lib/utils";

const BATCH_SIZE = 100;
const TOTAL_BRANCHES = 1000;
const MAX_BATCH_RETRIES = 2;

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;

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
  if (!GRAPHQL_ENDPOINT) {
    throw new Error(
      "NEXT_PUBLIC_GRAPHQL_ENDPOINT is not set. Add it to .env.local before running the app."
    );
  }

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

  const json = (await response.json()) as GraphQLResponse;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }
  return json;
}

async function fetchBranchesWithRetry(
  skip: number,
  limit: number,
  retries = MAX_BATCH_RETRIES
): Promise<GraphQLResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchBranches(skip, limit);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Batch fetch failed");
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

      // First fetch must succeed — without it we don't know the total batch count
      const firstResult = await fetchBranchesWithRetry(0, BATCH_SIZE);

      if (!firstResult.data?.Branch) {
        throw new Error("No branch data received");
      }

      const total = firstResult.data.Branch.total || TOTAL_BRANCHES;
      const batches = Math.ceil(total / BATCH_SIZE);
      const allItems: Branch[] = [];
      const failedBatches: number[] = [];

      allItems.push(...transformBranches(firstResult.data.Branch.items));
      setLoadProgress(1 / batches);

      const remainingBatches: number[] = [];
      for (let i = 1; i < batches; i++) remainingBatches.push(i);

      const chunkSize = 3;
      for (let i = 0; i < remainingBatches.length; i += chunkSize) {
        const chunk = remainingBatches.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(async (batchIndex) => {
            try {
              const r = await fetchBranchesWithRetry(batchIndex * BATCH_SIZE, BATCH_SIZE);
              return { batchIndex, result: r, ok: true as const };
            } catch (err) {
              console.error(`Batch ${batchIndex} failed:`, err);
              return { batchIndex, result: null, ok: false as const };
            }
          })
        );

        for (const entry of results) {
          if (!entry.ok || !entry.result?.data?.Branch?.items) {
            failedBatches.push(entry.batchIndex);
            continue;
          }
          allItems.push(...transformBranches(entry.result.data.Branch.items));
        }

        setLoadProgress((i + chunk.length + 1) / batches);
      }

      setAllBranches(allItems);
      if (failedBatches.length > 0) {
        setError(
          new Error(
            `Loaded ${allItems.length} branches, but ${failedBatches.length} batch(es) failed.`
          )
        );
      }
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
