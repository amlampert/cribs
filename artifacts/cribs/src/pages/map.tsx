import { useState, useRef, useEffect } from "react";
import { useGetMapListings } from "@workspace/api-client-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLocation } from "wouter";

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [location, setLocation] = useLocation();
  const [bounds, setBounds] = useState<string | undefined>();
  
  const { data: listings } = useGetMapListings(
    { bounds, filter: "all" },
    { query: { enabled: !!bounds } }
  );

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZXhhbXBsZXRva2VuIiwiYSI6ImNsamhlNng3YTAxcWYzcW9mNWwxdTN5am8ifQ.example";
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283],
      zoom: 3,
    });

    map.current.on("moveend", () => {
      if (!map.current) return;
      const b = map.current.getBounds();
      if (b) {
        setBounds(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`);
      }
    });

    map.current.on("load", () => {
      if (!map.current) return;
      const b = map.current.getBounds();
      if (b) {
        setBounds(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !listings) return;

    // A real app would use markers or a source/layer. 
    // Simplified version here:
    const markers = document.getElementsByClassName('custom-marker');
    while(markers.length > 0){
        markers[0].parentNode?.removeChild(markers[0]);
    }

    listings.forEach((listing) => {
      const el = document.createElement('div');
      el.className = 'custom-marker w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md cursor-pointer';
      
      if (listing.valueBadge === 'gem') el.classList.replace('bg-primary', 'bg-gem');
      else if (listing.valueBadge === 'sus') el.classList.replace('bg-primary', 'bg-sus');
      else if (listing.valueBadge === 'delusional') el.classList.replace('bg-primary', 'bg-destructive');

      el.addEventListener('click', () => {
        setLocation(`/listing/${listing.id}`);
      });

      new mapboxgl.Marker(el)
        .setLngLat([listing.longitude, listing.latitude])
        .addTo(map.current!);
    });

  }, [listings, setLocation]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}