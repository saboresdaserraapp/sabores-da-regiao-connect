import { Link } from "react-router-dom";
import { Star, MapPin, Clock } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Establishment } from "@/data/mockData";
import { FavoriteButton } from "./FavoriteButton";

export function EstablishmentCard({ e }: { e: Establishment }) {
  return (
    <Link
      to={`/e/${e.slug}`}
      className="group block overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2"
    >
      <div className="relative h-44 overflow-hidden">
        <img src={e.cover} alt={e.name} loading="lazy" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <StatusBadge variant={e.openNow ? "aberto" : "fechado"} />
          <div className="flex items-center gap-2">
            {e.badges.includes("promocao") && <StatusBadge variant="promocao" compact />}
            <FavoriteButton kind="establishment" targetId={e.id} size="sm" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <img src={e.logo} alt="" className="size-11 rounded-full border-2 border-white object-cover shadow-md" />
        </div>
        <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
          <Star className="size-3 fill-accent text-accent" /> {e.rating.toFixed(1)}
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight tracking-tight">{e.name}</h3>
            <p className="text-xs text-muted-foreground">{e.categoryLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {e.services.map(s => <StatusBadge key={s} variant={s} compact />)}
          {e.badges.includes("recomendado") && <StatusBadge variant="recomendado" compact />}
          {e.badges.includes("turistas") && <StatusBadge variant="turistas" compact />}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{e.neighborhood} · {e.distanceKm}km</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3" />{e.etaMin}min</span>
        </div>
      </div>
    </Link>
  );
}
