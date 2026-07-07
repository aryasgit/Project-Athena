import { cookies } from "next/headers";

export type ModuleId = "placement" | "finance";

/** The active analytics module, from the `athena_module` cookie (default placement). */
export async function getModule(): Promise<ModuleId> {
  try {
    const store = await cookies();
    return store.get("athena_module")?.value === "finance" ? "finance" : "placement";
  } catch {
    return "placement";
  }
}
