import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// POST /auth/signout — ends the session and returns to the login page.
// POST only, so a link or image on another site cannot sign someone out.
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
