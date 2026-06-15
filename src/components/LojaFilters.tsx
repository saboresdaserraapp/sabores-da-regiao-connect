import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type CategoryKey } from "@/data/mockData";
import { X } from "lucide-react";

export interface LojaFiltersState {
  cats: CategoryKey[];
  price: [number, number];
  maxDistance: number;
  minRating: number;
  services: string[];
  styles: string[];
}

export const DEFAULT_FILTERS: LojaFiltersState = {
  cats: [],
  price: [0, 100],
  maxDistance: 20,
  minRating: 0,
  services: [],
  styles: [],
};

const STYLE_OPTIONS = [
  { key: "promo", label: "Em promoção" },
  { key: "popular", label: "Mais vendidos" },
  { key: "artesanal", label: "Artesanal / Exclusivo" },
  { key: "aberto", label: "Abertos agora" },
  { key: "recomendado", label: "Recomendados" },
  { key: "turistas", label: "Bom para turistas" },
];

const SERVICE_OPTIONS = [
  { key: "entrega", label: "Entrega" },
  { key: "retirada", label: "Retirada" },
  { key: "local", label: "Consumo no local" },
];

const RATING_OPTIONS = [
  { value: 0, label: "Qualquer" },
  { value: 4, label: "4+" },
  { value: 4.5, label: "4,5+" },
  { value: 4.7, label: "4,7+" },
];

interface Props {
  value: LojaFiltersState;
  onChange: (v: LojaFiltersState) => void;
  onReset: () => void;
}

export function LojaFilters({ value, onChange, onReset }: Props) {
  const toggleArr = <T extends string>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
          <X className="mr-1 size-3" /> Limpar
        </Button>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Categoria</div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => {
            const active = value.cats.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => onChange({ ...value, cats: toggleArr(value.cats, c.key) })}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Faixa de preço</span>
          <span className="text-muted-foreground">
            R$ {value.price[0]} – R$ {value.price[1]}{value.price[1] >= 100 ? "+" : ""}
          </span>
        </div>
        <Slider
          min={0}
          max={100}
          step={2}
          value={value.price}
          onValueChange={(v) => onChange({ ...value, price: [v[0], v[1]] as [number, number] })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Distância máxima</span>
          <span className="text-muted-foreground">{value.maxDistance} km</span>
        </div>
        <Slider
          min={1}
          max={20}
          step={1}
          value={[value.maxDistance]}
          onValueChange={(v) => onChange({ ...value, maxDistance: v[0] })}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Avaliação mínima</div>
        <div className="flex flex-wrap gap-1.5">
          {RATING_OPTIONS.map(r => (
            <button
              key={r.value}
              onClick={() => onChange({ ...value, minRating: r.value })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                value.minRating === r.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Estilo</div>
        <div className="space-y-2">
          {STYLE_OPTIONS.map(s => (
            <label key={s.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={value.styles.includes(s.key)}
                onCheckedChange={() => onChange({ ...value, styles: toggleArr(value.styles, s.key) })}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Forma de receber</div>
        <div className="space-y-2">
          {SERVICE_OPTIONS.map(s => (
            <label key={s.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={value.services.includes(s.key)}
                onCheckedChange={() => onChange({ ...value, services: toggleArr(value.services, s.key) })}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
