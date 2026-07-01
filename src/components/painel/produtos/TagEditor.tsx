import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Tag as TagIcon } from "lucide-react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  establishmentId: string;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
}

const DEFAULT_SUGGESTIONS = [
  "mais-vendido", "novo", "vegetariano", "vegano", "sem-lactose", "sem-gluten",
  "apimentado", "serve-2", "recomendado", "kids", "saudavel", "artesanal",
];

function normalize(tag: string) {
  return tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 30);
}

export function TagEditor({
  value,
  onChange,
  establishmentId,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Digite uma tag e pressione Enter",
  max = 10,
}: Props) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live preview of what would be saved after backend normalization
  const normalizedPreview = normalize(input);
  const previewIsDupe = !!normalizedPreview && value.includes(normalizedPreview);
  const previewIsLimit = value.length >= max;
  const previewChanged = input.trim() !== normalizedPreview && normalizedPreview.length > 0;

  // Carrega tags já usadas no estabelecimento para sugestão automática
  const { data: usedTags = [] } = useQuery({
    queryKey: ["tags-in-use", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("tags_json")
        .eq("establishment_id", establishmentId);
      const set = new Set<string>();
      (data ?? []).forEach((row) => {
        const arr = Array.isArray(row.tags_json) ? (row.tags_json as string[]) : [];
        arr.forEach((t) => typeof t === "string" && set.add(t));
      });
      return Array.from(set);
    },
  });

  const allSuggestions = useMemo(() => {
    const merged = new Set<string>([...suggestions, ...usedTags]);
    return Array.from(merged).sort();
  }, [suggestions, usedTags]);

  const filtered = useMemo(() => {
    const q = normalize(input);
    return allSuggestions
      .filter((t) => !value.includes(t))
      .filter((t) => !q || t.includes(q))
      .slice(0, 8);
  }, [allSuggestions, input, value]);

  const addTag = (raw: string) => {
    const tag = normalize(raw);
    if (!tag) return;
    if (value.includes(tag)) return;
    if (value.length >= max) return;
    onChange([...value, tag]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  useEffect(() => {
    if (!focused) return;
    const onDoc = (e: MouseEvent) => {
      if (!inputRef.current?.parentElement?.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [focused]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2 min-h-10 focus-within:ring-2 focus-within:ring-ring/50">
        <TagIcon className="size-3.5 text-muted-foreground shrink-0" />
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            <span className="text-[11px]">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full hover:bg-background/60 p-0.5"
              aria-label={`Remover tag ${tag}`}
            >
              <X className="size-2.5" />
            </button>
          </Badge>
        ))}
        <div className="relative flex-1 min-w-[140px]">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setFocused(true)}
            placeholder={value.length >= max ? `Limite de ${max} tags atingido` : placeholder}
            disabled={value.length >= max}
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {focused && filtered.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-md border border-border bg-popover shadow-md max-h-52 overflow-auto">
              {filtered.map((s) => (
                <button
                  type="button"
                  key={s}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(s)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent text-left"
                >
                  <Plus className="size-3 text-muted-foreground" />
                  <span>{s}</span>
                  {usedTags.includes(s) && (
                    <span className="ml-auto text-[9px] text-muted-foreground italic">já usada</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewChanged && !previewIsDupe && !previewIsLimit && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground rounded-md bg-primary/5 border border-primary/20 px-2 py-1">
          <span>Será salvo como:</span>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
            {normalizedPreview}
          </Badge>
          <span className="italic">(kebab-case, sem acento)</span>
        </div>
      )}
      {previewIsDupe && (
        <p className="text-[10px] text-amber-600">
          Já existe uma tag <span className="font-mono">{normalizedPreview}</span> — será ignorada.
        </p>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Enter ou vírgula para adicionar. Backspace remove a última.</span>
        <span>
          <span className={value.length >= max ? "text-destructive font-semibold" : ""}>{value.length}</span>
          /{max} tags · até 30 chars cada
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        As tags são normalizadas no backend antes de salvar (minúsculas, sem acento, hífens no lugar de espaços, duplicadas removidas).
      </p>
    </div>
  );
}