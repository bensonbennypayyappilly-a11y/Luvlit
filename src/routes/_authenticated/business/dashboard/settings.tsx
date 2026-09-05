import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsForm } from "@/components/account-settings-form";

export const Route = createFileRoute("/_authenticated/business/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Business dashboard — LuvLit" },
      { name: "description", content: "Manage your personal account details for LuvLit." },
      { property: "og:title", content: "Settings — Business dashboard — LuvLit" },
      { property: "og:description", content: "Update your name, phone and contact email." },
    ],
  }),
  component: () => <AccountSettingsForm role="business" />,
});
