import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { BottomNav } from "@/components/bottom-nav";
import NotFound from "@/pages/not-found";

import Feed from "@/pages/feed";
import Listing from "@/pages/listing";
import MapView from "@/pages/map";
import Explore from "@/pages/explore";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="w-full min-h-[100dvh] flex justify-center bg-surface">
      <div className="w-full max-w-[480px] bg-background min-h-[100dvh] relative shadow-2xl pb-16">
        <Switch>
          <Route path="/" component={Feed} />
          <Route path="/listing/:id" component={Listing} />
          <Route path="/map" component={MapView} />
          <Route path="/explore" component={Explore} />
          <Route path="/saved" component={Saved} />
          <Route path="/profile" component={Profile} />
          <Route path="/auth" component={Auth} />
          <Route component={NotFound} />
        </Switch>
        <BottomNav />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
