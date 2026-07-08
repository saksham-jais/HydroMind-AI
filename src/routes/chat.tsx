import { createFileRoute, redirect } from "@tanstack/react-router";

// /chat is no longer used — redirect to /contacts
export const Route = createFileRoute("/chat")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/contacts" });
  },
  component: () => null,
});
