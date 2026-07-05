import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AuthProvider } from "@/components/providers/AuthContext"
import { createServerClient } from "@/lib/supabase/server"

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the user + sidebar avatar once here (C5). Passed into AuthProvider
  // and the sidebar so neither fires its own getUser()/profile round trip on
  // every (main) navigation.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <AuthProvider initialUser={user}>
      <SidebarProvider>
        <AppSidebar initialAvatarUrl={profile?.avatar_url ?? null} />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
