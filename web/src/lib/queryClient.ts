import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { errorParser } from "@/hooks/useErrorParser";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) =>
      toast.error("Couldn't load data", {
        description: errorParser(error)?.message,
      }),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
