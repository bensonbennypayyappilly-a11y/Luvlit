import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatPanel } from "@/components/chat-panel";
import { useAccount } from "@/hooks/use-session";
import { isStoragePath, useMediaUrl } from "@/components/media-uploader";

export const Route = createFileRoute("/_authenticated/dashboard/requirements")({
  head: () => ({
    meta: [
      { title: "My requirements — LuvLit" },
      {
        name: "description",
        content: "Track the requirements you've posted and chat with businesses who quoted you.",
      },
      { property: "og:title", content: "My requirements — LuvLit" },
      { property: "og:description", content: "See quotes on your posted requirements." },
    ],
  }),
  component: Requirements,
});

function RequirementThumbs({ imageUrls }: { imageUrls: string[] | null | undefined }) {
  if (!imageUrls || imageUrls.length === 0) return null;
  return (
    <div className="mt-3 flex gap-2">
      {imageUrls.slice(0, 3).map((path, i) => (
        <RequirementThumb key={i} path={path} />
      ))}
    </div>
  );
}

function RequirementThumb({ path }: { path: string }) {
  const resolved = useMediaUrl(path, "requirement-media");
  const url = isStoragePath(path) ? resolved : path;
  if (!url) return null;
  return <img src={url} alt="" className="h-14 w-14 rounded-md object-cover" />;
}

function Requirements() {
  const { userId } = useAccount();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["my-requirements", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: requirements } = await supabase
        .from("requirements")
        .select("*")
        .eq("posted_by_user_id", userId!)
        .order("created_at", { ascending: false });

      const withCounts = await Promise.all(
        (requirements ?? []).map(async (r) => {
          const { count } = await supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("requirement_id", r.id);
          return { ...r, quoteCount: count ?? 0 };
        }),
      );
      return withCounts;
    },
  });

  const { data: conversations } = useQuery({
    queryKey: ["requirement-conversations", openId],
    enabled: !!openId,
    queryFn: async () =>
      (
        await supabase
          .from("conversations")
          .select("id, party_a_id, party_a_type, party_b_id, party_b_type")
          .eq("requirement_id", openId!)
      ).data ?? [],
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-20">
        <p className="eyebrow">Your requests</p>
        <h1 className="mt-4 text-4xl">My requirements</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Every requirement you've posted, and the quotes businesses have sent you.
        </p>

        <div className="mt-12 space-y-5">
          {(data ?? []).map((r) => (
            <div key={r.id} className="surface-card p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{r.category}</p>
                  <p className="mt-2 text-lg">{r.description}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {r.city} {r.budget ? `· ₹${r.budget}` : ""}
                  </p>
                  <RequirementThumbs imageUrls={(r as any).image_urls} />
                </div>
                <button
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="rounded-md border border-accent px-5 py-2.5 text-sm font-medium text-accent hover:bg-accent-soft"
                >
                  {r.quoteCount} {r.quoteCount === 1 ? "quote" : "quotes"} →
                </button>
              </div>

              {openId === r.id && (
                <div className="mt-6 space-y-4">
                  {(conversations ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No quotes yet — check back soon.</p>
                  )}
                  {(conversations ?? []).map((c) => (
                    <ChatPanel
                      key={c.id}
                      conversationId={c.id}
                      senderType="customer"
                      senderId={userId!}
                      title="Conversation"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {!data?.length && (
            <p className="text-muted-foreground">You haven't posted a requirement yet.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
