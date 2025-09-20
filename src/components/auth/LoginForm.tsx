import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { useAuthStore, useInitializeAuth } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import gymHeroImage from "@/assets/gym-hero.jpg";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, isAuthenticated, token } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize auth and get initialization status
  const { isInitializing, isInitialized } = useInitializeAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    // Only redirect after initialization is complete
    if (isInitialized && !isInitializing && isAuthenticated && token) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, token, isInitialized, isInitializing, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(username, password);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to AfrGym Admin.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show loading while checking if user is already authenticated or during login
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">
            {isInitializing ? "Checking authentication..." : "Signing in..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={gymHeroImage}
          alt="Modern gym interior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white">
          <h2 className="text-4xl font-bold mb-2">Welcome to AfrGym</h2>
          <p className="text-xl opacity-90">
            Professional gym management made simple
          </p>
        </div>
      </div>

      {/* Login Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-background to-muted/30">
        <Card className="w-full max-w-md shadow-gym border-0">
          <CardHeader className="text-center space-y-6">
            <div className="mx-auto gradient-gym p-4 rounded-2xl w-fit">
              <Dumbbell className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                Welcome to AfrGym
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to your admin account
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john_doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-gym text-white font-semibold hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
