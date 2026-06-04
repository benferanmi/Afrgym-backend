import { ShieldX } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface SuperAdminOnlyProps {
  children: React.ReactNode;
}

export function SuperAdminOnly({ children }: SuperAdminOnlyProps) {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <ShieldX className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold text-muted-foreground">
            Access Restricted
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This page is only available to super admins.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}