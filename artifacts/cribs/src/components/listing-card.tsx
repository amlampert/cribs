import { Link } from "wouter";
import { ListingWithStats } from "@workspace/api-client-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { ReactionBar } from "./reaction-bar";
import { cn } from "@/lib/utils";
import { MapPin, MessageCircle } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export function ValueBadge({ listing }: { listing: ListingWithStats }) {
  if (!listing.pricePerSqft || !listing.areaAvgPricePerSqft) return null;
  
  const diff = (listing.pricePerSqft - listing.areaAvgPricePerSqft) / listing.areaAvgPricePerSqft;
  
  if (diff < -0.15) {
    return <Badge className="bg-gem text-gem-foreground hover:bg-gem font-bold uppercase tracking-wider text-[10px] shadow-md border-none">Gem</Badge>;
  } else if (diff > 0.3) {
    return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive font-bold uppercase tracking-wider text-[10px] shadow-md border-none">Delusional</Badge>;
  } else if (diff > 0.15) {
    return <Badge className="bg-sus text-sus-foreground hover:bg-sus font-bold uppercase tracking-wider text-[10px] shadow-md border-none">Sus</Badge>;
  }
  
  return null;
}

export function StatusLabel({ listing }: { listing: ListingWithStats }) {
  let label = "";
  
  if (listing.status === "active") label = "Just dropped";
  if (listing.status === "pending") label = "Pending";
  if (listing.status === "back_on_market") label = "Back from the dead";
  if (listing.status === "sold") {
    return (
      <div className="flex items-baseline gap-2 drop-shadow-md">
        <span className="text-white font-black text-3xl">
          ${listing.soldPrice?.toLocaleString()}
        </span>
        <span className="text-white/80 line-through text-sm font-bold">
          ${listing.price.toLocaleString()}
        </span>
      </div>
    );
  }
  
  if (listing.originalPrice && listing.originalPrice > listing.price) {
    const diff = listing.originalPrice - listing.price;
    label = `Slashed -$${Math.round(diff / 1000)}k`;
  }
  
  return (
    <div className="flex flex-col gap-1 drop-shadow-md">
      {label && (
        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider w-max shadow-sm">
          {label}
        </span>
      )}
      <span className="text-white font-black text-3xl">
        ${listing.price.toLocaleString()}
      </span>
    </div>
  );
}

export function ListingCard({ listing, isDetail = false }: { listing: ListingWithStats; isDetail?: boolean }) {
  const photos = listing.photos?.length > 0 ? listing.photos : ["https://placehold.co/800x600/e5e5e5/6b6b6b?text=No+Photo"];
  
  const content = (
    <div className="bg-card">
      <div className="relative">
        <Carousel className="w-full">
          <CarouselContent>
            {photos.map((photo, index) => (
              <CarouselItem key={index}>
                <AspectRatio ratio={4/3}>
                  <img 
                    src={photo} 
                    alt={`${listing.address} - ${index + 1}`}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                </AspectRatio>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        
        {photos.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
            1/{photos.length}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-between items-end pointer-events-none z-10">
          <StatusLabel listing={listing} />
          <ValueBadge listing={listing} />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-lg font-bold leading-tight line-clamp-1">{listing.address}</h2>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          {listing.city}, {listing.state}
        </p>
        
        <div className="flex items-center gap-4 text-sm font-medium mb-4 pb-4 border-b border-border">
          <div><span className="font-bold">{listing.beds}</span> bds</div>
          <div className="w-1 h-1 rounded-full bg-border" />
          <div><span className="font-bold">{listing.bathsFull + (listing.bathsHalf * 0.5)}</span> ba</div>
          <div className="w-1 h-1 rounded-full bg-border" />
          <div><span className="font-bold">{listing.sqft?.toLocaleString()}</span> sqft</div>
        </div>

        <ReactionBar listing={listing} />

        {listing.hashtags && listing.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {listing.hashtags.map(tag => (
              <span key={tag} className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {listing.topComment && !isDetail && (
          <div className="mt-3 bg-surface p-3 rounded-lg flex gap-3">
            <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold mr-2">{listing.topComment.user.username}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">{listing.topComment.body}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isDetail) return content;
  
  return (
    <div className="mb-2 border-b-8 border-surface pb-2">
      <Link href={`/listing/${listing.id}`} data-testid={`link-listing-${listing.id}`} className="block">
        {content}
      </Link>
    </div>
  );
}