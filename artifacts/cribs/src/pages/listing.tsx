import { useGetListing } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { ListingCard } from "@/components/listing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function Listing() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: listing, isLoading } = useGetListing(id);

  if (isLoading) {
    return <div className="p-4 pt-20"><Skeleton className="w-full aspect-[4/3] rounded-xl" /></div>;
  }

  if (!listing) {
    return <div className="p-4 pt-20 text-center">Listing not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md pt-safe max-w-[480px] mx-auto border-b border-border">
        <div className="h-14 flex items-center px-2">
          <Link href="/" className="p-2 rounded-full hover:bg-surface transition-colors" data-testid="link-back">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <span className="font-semibold ml-2 text-sm truncate">{listing.address}</span>
        </div>
      </div>
      
      <div className="pt-14 pb-20">
        <ListingCard listing={listing} isDetail />
        
        <div className="px-4 py-6 border-t border-border">
          <h2 className="text-lg font-bold mb-2">About this home</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {listing.description || "No description provided."}
          </p>
        </div>

        <div className="px-4 py-6 border-t border-border">
          <h2 className="text-lg font-bold mb-4">Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs">Year Built</span>
              <span className="font-medium">{listing.yearBuilt || "Unknown"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Property Type</span>
              <span className="font-medium">{listing.propertyType || "Unknown"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Lot Size</span>
              <span className="font-medium">{listing.lotSize ? `${listing.lotSize} sqft` : "Unknown"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Stories</span>
              <span className="font-medium">{listing.stories || "Unknown"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
