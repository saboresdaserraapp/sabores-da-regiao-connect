import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBanners, type BannerPlacement } from "@/hooks/useBanners";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  placement: BannerPlacement;
  categoryKey?: string | null;
  establishmentId?: string | null;
  className?: string;
  aspect?: "wide" | "banner" | "square";
  rounded?: string;
}

export function BannerCarousel({
  placement,
  categoryKey,
  establishmentId,
  className,
  aspect = "wide",
  rounded = "rounded-2xl",
}: Props) {
  const { data: banners = [] } = useBanners(placement, { categoryKey, establishmentId });
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!banners.length || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length, paused]);

  useEffect(() => {
    const b = banners[i];
    if (!b) return;
    if (seenRef.current.has(b.id)) return;
    seenRef.current.add(b.id);
    supabase.rpc("increment_banner_metric", { _banner_id: b.id, _field: "impressions" }).then(() => {});
  }, [banners, i]);

  if (!banners.length) return null;
  const current = banners[i];

  const onClick = () => {
    supabase.rpc("increment_banner_metric", { _banner_id: current.id, _field: "clicks" }).then(() => {});
    if (current.link) window.open(current.link, "_blank", "noopener,noreferrer");
  };

  const aspectClass =
    aspect === "wide"
      ? "aspect-[21/9] sm:aspect-[24/7]"
      : aspect === "square"
        ? "aspect-square"
        : "aspect-[16/9]";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted shadow-card group",
        rounded,
        aspectClass,
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button onClick={onClick} className="block size-full text-left">
        <img
          src={current.image}
          alt={current.title ?? "Banner"}
          className="size-full object-cover"
          loading="lazy"
        />
        {(current.title || current.cta_label) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 text-white">
            {current.title && (
              <div className="font-display text-base sm:text-lg font-semibold drop-shadow">
                {current.title}
              </div>
            )}
            {current.cta_label && (
              <span className="mt-1 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {current.cta_label}
              </span>
            )}
          </div>
        )}
      </button>

      {banners.length > 1 && (
        <>
          <button
            aria-label="Anterior"
            onClick={() => setI((x) => (x - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-white/85 text-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Próximo"
            onClick={() => setI((x) => (x + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-white/85 text-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {banners.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Banner ${idx + 1}`}
                onClick={() => setI(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === i ? "w-6 bg-white" : "w-1.5 bg-white/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
