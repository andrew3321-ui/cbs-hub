import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experimente o CBSHub com um caso real",
  description: "Teste uma operação fiscal no ambiente público do CBSHub antes de criar sua conta.",
  robots: { index: false, follow: false },
};

type ExperimentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function guestHref(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams({ guest: "1" });
  for (const key of attributionKeys) {
    const rawValue = searchParams[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value?.trim()) params.set(key, value.trim().slice(0, 120));
  }
  return `/app?${params.toString()}`;
}

export default async function ExperimentPage({ searchParams }: ExperimentPageProps) {
  if (await getCurrentUser()) redirect("/app?view=intelligence");
  const attribution = await searchParams;
  redirect(guestHref(attribution));
}
