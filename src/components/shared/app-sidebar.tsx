"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  PhoneOutgoing,
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
    title: "Outbound Calls",
    url: "/dashboard/outbound",
    icon: PhoneOutgoing,
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

// Active nav styling: the shadcn sidebar variants already paint the brass wash
// (data-active:bg-sidebar-accent). On top of that we add a 2px brass LEFT
// indicator bar and tint the icon + label with the brass accent.
//
// Vertical tinting hook: this component has no active-vertical concept yet, so the
// accent defaults to brass (`brand`). To tint per active workspace, swap `brand`
// below for the matching vertical token, e.g. text-vertical-healthcare and
// before:bg-vertical-healthcare (supported: healthcare | restaurant | realestate).
const navItemClass =
  "relative [&_svg]:text-muted-foreground hover:[&_svg]:text-sidebar-accent-foreground " +
  "data-active:text-brand data-active:[&_svg]:text-brand " +
  "data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 " +
  "data-active:before:h-4 data-active:before:w-0.5 data-active:before:-translate-y-1/2 " +
  "data-active:before:rounded-full data-active:before:bg-brand";

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
              <div className="flex aspect-square size-8 items-center justify-center">
                <Image
                  src="/logo/mark.svg"
                  width={32}
                  height={32}
                  alt="VerticalVoice"
                  className="size-8 rounded-lg"
                  priority
                />
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
          <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<a href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={navItemClass}
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
          <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<a href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={navItemClass}
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
                    className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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
