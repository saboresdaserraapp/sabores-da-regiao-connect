import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Button } from "@/components/ui/button";
import { Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Props {
  productId: string;
  establishmentId: string;
  max?: number;
}

type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean | null;
  display_order: number | null;
};

export function ProductGalleryEditor({ productId, establishmentId, max = 5 }: Props) {
  const qc = useQueryClient();
  const queryKey = ["product-images", productId];

  const { data: images = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("id,product_id,image_url,is_primary,display_order")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductImageRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const addImage = async (url: string) => {
    if (!url) return;
    const nextOrder = (images[images.length - 1]?.display_order ?? images.length - 1) + 1;
    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      image_url: url,
      is_primary: false,
      display_order: nextOrder,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Foto adicionada à galeria");
      invalidate();
    }
  };

  const removeImage = async (id: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const remaining = Math.max(0, max - images.length);
  const folder = `establishments/${establishmentId}/products/${productId}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Galeria de fotos</p>
          <p className="text-[11px] text-muted-foreground">
            Até {max} fotos adicionais. {remaining} restantes.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando galeria...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={img.image_url}
                alt="Galeria"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeImage(img.id)}
                >
                  <Trash2 className="size-3 mr-1" /> Remover
                </Button>
              </div>
            </div>
          ))}

          {remaining > 0 && (
            <div className="aspect-square">
              <MediaUploader
                value=""
                onChange={addImage}
                bucket="public-media"
                folder={folder}
                allowUrlInput={false}
                aspect="aspect-square"
                label="Adicionar foto"
              />
            </div>
          )}

          {images.length === 0 && remaining === 0 && (
            <div className="col-span-full text-center py-8 border border-dashed rounded-lg">
              <ImageIcon className="size-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Nenhuma foto na galeria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}