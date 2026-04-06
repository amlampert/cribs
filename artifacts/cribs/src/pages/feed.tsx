import { useState, useEffect, useRef, useCallback } from "react";
import { useGetListings, GetListingsTab } from "@workspace/api-client-react";
import { ListingCard } from "@/components/listing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const TABS: { id: GetListingsTab; label: string }[] = [
  { id: "for_you", label: "For You" },
  { id: "gone_wild", label: "Gone Wild" },
  { id: "just_dropped", label: "Just Dropped" },
  { id: "gone", label: "Gone" },
  { id: "slashed", label: "Slashed" },
  { id: "dream_homes", label: "Dream Homes" },
  { id: "nightmares", label: "Nightmares" },
];

export default function Feed() {
  const [activeTab, setActiveTab] = useState<GetListingsTab>("for_you");
  const [offset, setOffset] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  
  const { data, isLoading, isFetching } = useGetListings({
    tab: activeTab,
    limit: 10,
    offset
  });

  const initializedRef = useRef<GetListingsTab>(activeTab);

  useEffect(() => {
    if (activeTab !== initializedRef.current) {
      setListings([]);
      setOffset(0);
      initializedRef.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    if (data?.listings) {
      setListings(prev => {
        const newItems = data.listings.filter(l => !prev.some(p => p.id === l.id));
        return [...prev, ...newItems];
      });
    }
  }, [data]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetching || !data?.hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && data?.hasMore) {
        setOffset(prev => prev + 10);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isFetching, data?.hasMore]);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="flex items-center px-4 h-14">
          <h1 className="text-xl font-bold text-primary">Cribs</h1>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-2 p-4 pt-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                  activeTab === tab.id 
                    ? "bg-foreground text-background" 
                    : "bg-surface text-muted-foreground hover:bg-surface/80"
                )}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      <div className="flex-1 pb-16">
        {listings.map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
        
        {(isLoading || isFetching) && (
          <div className="p-4 space-y-4">
            <Skeleton className="w-full aspect-[4/3] rounded-xl" />
            <Skeleton className="w-2/3 h-8" />
            <Skeleton className="w-1/2 h-4" />
          </div>
        )}
        
        {data?.hasMore && (
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            {isFetching && <div className="text-sm text-muted-foreground">Loading more...</div>}
          </div>
        )}
      </div>
    </div>
  );
}
