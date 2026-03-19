// src/hooks/useMemberSearch.ts
import { useDebounce } from "@/hooks/useDebounce";
import useSWR from "swr";

interface MemberSearchResult {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string;
}

interface UseMemberSearchReturn {
  members: MemberSearchResult[];
  isLoading: boolean;
}

const fetcher = async (url: string): Promise<MemberSearchResult[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch members: ${response.status}`);
  }
  const json = await response.json();
  return Array.isArray(json.data) ? json.data : [];
};

export function useMemberSearch(query: string): UseMemberSearchReturn {
  const debouncedQuery = useDebounce(query, 300);

  const shouldFetch = debouncedQuery.trim().length >= 2;
  const url = shouldFetch
    ? `/api/members?search=${encodeURIComponent(debouncedQuery.trim())}&take=10&select=minimal`
    : null;

  const { data, isLoading } = useSWR<MemberSearchResult[]>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300,
    keepPreviousData: false,
  });

  return {
    members: shouldFetch && data ? data : [],
    isLoading: shouldFetch ? isLoading : false,
  };
}