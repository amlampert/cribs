import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useGetMe, UserFlair } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user: authUser, isLoading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetMe({
    query: { enabled: !!authUser }
  });

  if (authLoading) return <div className="p-4 flex justify-center pt-20"><Skeleton className="w-8 h-8 rounded-full" /></div>;
  
  if (!authUser) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="px-4 py-3 flex justify-between items-center h-14">
          <h1 className="text-xl font-bold">{profile?.username || 'Profile'}</h1>
          <Button variant="ghost" size="sm" onClick={signOut} data-testid="btn-signout">Sign out</Button>
        </div>
      </div>

      {profileLoading ? (
        <div className="p-4 space-y-4 flex flex-col items-center">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="w-32 h-6" />
        </div>
      ) : profile ? (
        <div className="p-6 bg-background mb-2 flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-sm">
            <AvatarImage src={profile.avatarUrl || ''} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {profile.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">{profile.username}</h2>
          <div className="mt-1 mb-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface text-muted-foreground uppercase tracking-wider">
            {profile.flair.replace('_', ' ')}
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            {profile.bio || "Just here for the Zillow drama."}
          </p>

          <div className="grid grid-cols-3 w-full gap-4 mt-6 pt-6 border-t border-border">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{profile.totalReactionsGiven || 0}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Reactions</span>
            </div>
            <div className="flex flex-col items-center border-x border-border">
              <span className="text-xl font-bold">{profile.totalComments || 0}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Comments</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{profile.totalSaves || 0}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Saved</span>
            </div>
          </div>
        </div>
      ) : null}
      
    </div>
  );
}