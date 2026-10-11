import { redirect } from "next/navigation";

// Dashboard comes later; until then the portal home is the get-started checklist.
export default function PortalHome() {
  redirect("/portal/get-started");
}
