import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  QrCode,
  CreditCard,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Members", url: "/members", icon: Users },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
  { title: "Memberships", url: "/memberships", icon: CreditCard },
  { title: "Email Center", url: "/emails", icon: Mail },
  // { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";


  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };


  return (
    <Sidebar className="border-r-0" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="gradient-gym p-2 rounded-lg">
            <Dumbbell className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-sidebar-foreground">
                AfrGym
              </h2>
              <p className="text-xs text-sidebar-foreground/70">Admin Panel</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="absolute -right-3 bg-black/60 top-6 bg-sidebar-background border border-sidebar-border rounded-full p-1 hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
          )}
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "text-xs font-semibold text-sidebar-foreground/70 mb-2",
              collapsed && "sr-only"
            )}
          >
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      "w-full justify-start gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent group",
                      isActive(item.url) &&
                        "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    )}
                  >
                    <NavLink to={item.url}>
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          isActive(item.url)
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70"
                        )}
                      />
                      {!collapsed && (
                        <span
                          className={cn(
                            "font-medium transition-colors",
                            isActive(item.url)
                              ? "text-sidebar-primary-foreground"
                              : "text-sidebar-foreground"
                          )}
                        >
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
