import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface HouseReferenceMedia {
  id: string;
  house_reference_id: string;
  media_type: 'photo' | 'video';
  media_url: string;
  thumbnail_url: string | null;
  display_order: number;
  label: string | null;
}

export interface HouseReference {
  id: string;
  user_id: string;
  address_id: string | null;
  media_urls: string[]; // Fallback / legacy
  video_url: string | null; // Fallback / legacy
  photo_1_url?: string | null;
  photo_2_url?: string | null;
  photo_3_url?: string | null;
  photo_4_url?: string | null;
  photo_5_url?: string | null;
  instructions: string | null;
  pin_1_description: string | null;
  pin_2_description: string | null;
  pin_3_description: string | null;
  updated_at?: string;
  media?: HouseReferenceMedia[];
}

export function useHouseReference(addressId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["house-ref", user?.id, addressId],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("house_references").select("*, media:house_reference_media(*)").eq("user_id", user!.id);
      if (addressId) {
        q = q.eq("address_id", addressId);
      } else {
        q = q.is("address_id", null);
      }
      const { data, error } = await q.maybeSingle();
      if (error) {
        console.error("Error fetching house reference:", error);
        return null;
      }
      if (!data) return null;
      
      const media = (data as any).media || [];
      const photosFromMedia = media.filter((m: any) => m.media_type === 'photo').map((m: any) => m.media_url);
      const videoFromMedia = media.find((m: any) => m.media_type === 'video')?.media_url;

      const row = data as any;
      const legacyPhotos = [
        row.photo_1_url,
        row.photo_2_url,
        row.photo_3_url,
        row.photo_4_url,
        row.photo_5_url
      ].filter(Boolean) as string[];

      let finalPhotos = photosFromMedia;
      if (finalPhotos.length === 0) {
        finalPhotos = Array.isArray(data.media_urls) ? (data.media_urls as string[]) : [];
      }
      if (finalPhotos.length === 0) {
        finalPhotos = legacyPhotos;
      }

      return {
        ...data,
        media_urls: finalPhotos,
        video_url: videoFromMedia || data.video_url,
        media: media
      } as HouseReference;
    },
  });
}

export function useHouseReferenceSave(addressId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return async (patch: Partial<HouseReference>, mediaItems?: Partial<HouseReferenceMedia>[]) => {
    if (!user) return;
    
    // 1. Upsert the main reference
    const refData = { 
      user_id: user.id, 
      address_id: addressId || null,
      ...patch 
    };

    const { data: ref, error: refError } = await supabase.from("house_references").upsert(
      refData as any,
      { onConflict: 'user_id,address_id' }
    ).select("id").maybeSingle();

    if (refError) {
      console.error("Erro ao salvar referência:", refError);
      return toast.error(refError.message);
    }

    const houseReferenceId = ref.id;

    // 2. Handle media items if provided
    if (mediaItems) {
      // First, we might want to delete removed items or just replace everything for simplicity
      // But a better approach is to only sync the new list
      
      // Delete old active media for this reference to replace with new state
      // (Simplified approach: replace current media state with the new list)
      await supabase.from("house_reference_media").delete().eq("house_reference_id", houseReferenceId);

      if (mediaItems.length > 0) {
        const itemsToInsert = mediaItems.map((item, index) => ({
          ...item,
          house_reference_id: houseReferenceId,
          user_id: user.id,
          address_id: addressId || null,
          display_order: index
        }));

        const { error: mediaError } = await supabase.from("house_reference_media").insert(itemsToInsert as any);
        if (mediaError) {
          console.error("Erro ao salvar mídias:", mediaError);
          toast.error("Erro ao salvar algumas mídias");
        }
      }
    }
    
    toast.success("Referência salva");
    qc.invalidateQueries({ queryKey: ["house-ref", user.id, addressId] });
    qc.invalidateQueries({ queryKey: ["house-ref", user.id] }); // Also invalidate the general one just in case
  };
}