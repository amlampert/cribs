import { Link, useLocation } from "wouter";
import { Home, Map as MapIcon, Search, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const tabs = [
    { href: "/", icon: Home, label: "Feed" },
    { href: "/map", icon: MapIcon, label: "Map" },
    { href: "/explore", icon: Search, label: "Explore" },
    { href: "/saved", icon: Bookmark, label: "Saved", auth: true },
    { href: "/profile", icon: User, label: "Profile", auth: true },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="max-w-[480px] mx-auto flex items-center justify-around h-16 px-4">
        {tabs.map((tab) => {
          const isActive = location === tab.href || (tab.href !== "/" && location.startsWith(tab.href));
          
          if (tab.auth && !user) {
            return (
              <Link key={tab.href} href="/auth" className={cn("flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors", isActive && "text-primary")}>
                <tab.icon className={cn("w-6 h-6", isActive && "fill-current")} />
                <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
              </Link>
            )
          }

          return (
            <Link key={tab.href} href={tab.href} className={cn("flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors", isActive && "text-primary")}>
              <tab.icon className={cn("w-6 h-6", isActive && "fill-current")} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}