import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster, TooltipProvider } from "@moduleleague/ui";
import { createModuleRouter } from "@/module/shell/createModuleRouter";
import { moduleConfig } from "@/config/config";
import { queryClient } from "@/lib/queryClient";

// Built once at startup; throws early if src/config/config.ts has a mistake
const router = createModuleRouter(moduleConfig);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
