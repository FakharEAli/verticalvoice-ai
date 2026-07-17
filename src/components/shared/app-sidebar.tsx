"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  History,
  Bot,
  Brain,
  Building2,
  Plug,
  FlaskConical,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  Shield,
  LogOut,
  ChevronsUpDown,
  Zap,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/database/supabase-client";

const mainNavItems = [
  {
    title: "Overview",
    url: "/dashboard/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Live Calls",
    url: "/dashboard/calls",
    icon: Phone,
  },
  {
    title: "Call History",
    url: "/dashboard/calls?tab=history",
    icon: History,
  },
  {
    title: "Agent",
    url: "/dashboard/agent",
    icon: Bot,
  },
  {
    title: "Knowledge",
    url: "/dashboard/knowledge",
    icon: Brain,
  },
  {
    title: "Industry Operations",
    url: "/dashboard/operations",
    icon: Building2,
  },
  {
    title: "Integrations",
    url: "/dashboard/integrations",
    icon: Plug,
  },
  {
    title: "Test Center",
    url: "/dashboard/test-center",
    icon: FlaskConical,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
  },
];

const bottomNavItems = [
  {
    title: "Team",
    url: "/dashboard/team",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Usage & Cost",
    url: "/dashboard/usage",
    icon: CreditCard,
  },
  {
    title: "Audit Log",
    url: "/dashboard/audit",
    icon: Shield,
  },
];

interface AppSidebarProps {
  user: {
    email: string;
    name?: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (url: string) => {
    if (url.includes("?")) {
      return pathname === url.split("?")[0];
    }
    return pathname === url || pathname.startsWith(url + "/");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const displayName = user.name || user.email.split("@")[0];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="/dashboard/overview" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">VerticalVoice</span>
                <span className="truncate text-xs text-muted-foreground">
                  AI Calling Platform
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<a href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon aria-hidden="true" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<a href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon aria-hidden="true" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
                style={
                  {
                    // Neutralize the enter/exit scale (zoom-in/zoom-out) transform so the
                    // popup's hit-box matches its final visual size from the first frame.
                    // Without this, clicking "Sign out" during the ~100ms open animation
                    // can miss the still-scaling element (click appears to require a
                    // second attempt once the animation settles).
                    "--tw-enter-scale": 1,
                    "--tw-exit-scale": 1,
                  } as React.CSSProperties
                }
              >
                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
