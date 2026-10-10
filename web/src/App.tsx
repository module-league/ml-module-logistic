import { RouterProvider } from "react-router";
import { Toaster, TooltipProvider } from "@moduleleague/ui";
import { createModuleRouter } from "@/components/app/createModuleRouter";
import { moduleConfig } from "@/config/config";

// Built once at startup; throws early if src/config/config.ts has a mistake
const router = createModuleRouter(moduleConfig);

function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </TooltipProvider>
  );
}

export default App;
