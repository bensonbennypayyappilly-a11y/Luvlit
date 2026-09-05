import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsForm } from "@/components/account-settings-form";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — LuvLit" },
      {
        name: "description",
        content: "Manage your LuvLit account details.",
      },
      { property: "og:title", content: "Account settings — LuvLit" },
      { property: "og:description", content: "Update your name, phone and email." },
    ],
  }),
  component: () => <AccountSettingsForm role="customer" />,
});
