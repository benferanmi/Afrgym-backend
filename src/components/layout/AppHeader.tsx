import { useState } from "react";
import { Search, User, LogOut, Menu, X, LayoutDashboard, Users, QrCode, CreditCard, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Members", url: "/members", icon: Users },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
  { title: "Memberships", url: "/memberships", icon: CreditCard },
  { title: "Email Center", url: "/emails", icon: Mail },
];

export function AppHeader() {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between relative z-30">
        {/* Mobile menu button + Search */}
        <div className="flex items-center gap-3 flex-1">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div className="flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members, QR codes..."
                className="pl-10 bg-muted/50 border-0"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 md:px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImage} alt={user?.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.username
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                {/* Hide user info on very small screens */}
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.username}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {user?.role}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Navigation Overlay - Only shows on mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden">
          <div className="fixed left-0 top-0 h-full w-80 bg-card border-r shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="gradient-gym p-2 rounded-lg">
                  <div className="h-6 w-6 bg-white rounded"></div>
                </div>
                <div>
                  <h2 className="text-lg font-bold">AfrGym</h2>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileMenu}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="p-4">
              <div className="space-y-2">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      "hover:bg-accent",
                      isActive(item.url)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}