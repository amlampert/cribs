import { useGetTrendingHashtags, useGetTrendingListings } from "@workspace/api-client-react";
import { ListingCard } from "@/components/listing-card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Explore() {
  const { data: hashtags } = useGetTrendingHashtags({ limit: 10 });
  const { data: trendingListings } = useGetTrendingListings({ limit: 5 });

  return (
    <div className="min-h-screen bg-surface pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search cities, zip codes, or @users" 
              className="pl-9 bg-surface border-transparent focus-visible:ring-primary rounded-full h-10"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {hashtags && hashtags.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Trending Tags</h2>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <div key={tag.hashtag} className="bg-background border border-border px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1">
                  <span className="text-primary">#</span>{tag.hashtag}
                  <span className="text-muted-foreground text-xs ml-1">{tag.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Hot Right Now</h2>
          <div className="space-y-4 bg-background p-4 rounded-xl shadow-sm border border-border">
            {trendingListings?.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}