import { useGetSaves } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/listing-card";

export default function Saved() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: saves, isLoading } = useGetSaves();

  if (authLoading) return <div className="p-4 flex justify-center pt-20"><Skeleton className="w-8 h-8 rounded-full" /></div>;
  
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="px-4 py-3 flex justify-between items-center h-14">
          <h1 className="text-xl font-bold">Saved Cribs</h1>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
             <Skeleton className="w-full aspect-[4/3] rounded-xl" />
             <Skeleton className="w-full aspect-[4/3] rounded-xl" />
          </div>
        ) : saves && saves.length > 0 ? (
          <div className="space-y-4">
            {saves.map((save) => (
              <ListingCard key={save.id} listing={save.listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p>You haven't saved any cribs yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}