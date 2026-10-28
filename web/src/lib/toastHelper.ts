import { toast } from "@moduleleague/ui";
import { errorParser } from "@/hooks/useErrorParser";

/** Runs a change and says when it fails; true when it worked. */
export async function attempt(failure: string, task: () => Promise<unknown>) {
  try {
    await task();
    return true;
  } catch (error) {
    toast.error(failure, { description: errorParser(error)?.message });
    return false;
  }
}
