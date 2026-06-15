import { Link } from "react-router-dom";
import { Star, MapPin, Clock } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Establishment } from "@/data/mockData";
import { FavoriteButton } from "./FavoriteButton";

export function EstablishmentCard({ e }: { e: Establishment }) {
  return (
    <Link to={`/e/${e.slug}`} className="group block overflow-hidden rounded-3xl bg-card shadow-card transition-all hover:shadow-soft hover:-translate-y-0.5">
      <div className="relative h-44 overflow-hidden">
        <img src={e.cover} alt={e.name} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <StatusBadge variant={e.openNow ? "aberto" : "fechado"} />
          <div className="flex items-center gap-2">
            {e.badges.includes("promocao") && <StatusBadge variant="promocao" compact />}
            <FavoriteButton kind="establishment" targetId={e.id} size="sm" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <img src={e.logo} alt="" className="size-10 rounded-full border-2 border-white object-cover" />
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold">
          <Star className="size-3 fill-accent text-accent" /> {e.rating.toFixed(1)}
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{e.name}</h3>
            <p className="text-xs text-muted-foreground">{e.categoryLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {e.services.map(s => <StatusBadge key={s} variant={s} compact />)}
          {e.badges.includes("recomendado") && <StatusBadge variant="recomendado" compact />}
          {e.badges.includes("turistas") && <StatusBadge variant="turistas" compact />}
        </div>
        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{e.neighborhood} · {e.distanceKm}km</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3" />{e.etaMin}min</span>
        </div>
      </div>
    </Link>
  );
}
