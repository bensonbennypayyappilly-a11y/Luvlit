import { useQuery } from "@tanstack/react-query";
import { getCities } from "@/lib/public.functions";
import { CITIES } from "@/lib/constants";

/** Live city list from the database, with the static list as a fallback. */
export function useCities(): string[] {
  const { data } = useQuery({
    queryKey: ["cities"],
    queryFn: () => getCities(),
    staleTime: 1000 * 60 * 60,
  });
  const names = (data ?? []).map((c) => c.name);
  return names.length ? names : CITIES;
}
