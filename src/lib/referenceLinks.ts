import { supabase } from "@/integrations/supabase/client";

export type ReferenceLinkKind = "delivery" | "visual";

export interface NormalizedReferenceLink {
  order?: any;
  address?: any;
  reference?: any;
  selected_media_json?: unknown;
  [key: string]: any;
}

/**
 * Unified loader for the two reference-share link RPCs:
 * - delivery → get_share_link_by_token (order_reference_share_links)
 * - visual   → get_visual_reference_by_token (order_visual_reference_links)
 *
 * Both return the same shape { link, order, address, reference }, so this
 * normalizes the payload (including merging house_reference_media into
 * reference.media_urls / reference.video_url) for both pages.
 */
export async function fetchReferenceByToken(
  kind: ReferenceLinkKind,
  token: string,
): Promise<NormalizedReferenceLink> {
  const fn = kind === "delivery" ? "get_share_link_by_token" : "get_visual_reference_by_token";
  const { data, error } = await supabase.rpc(fn as any, { _token: token });
  if (error || !data) throw new Error("Link inválido ou expirado");

  const payload = data as any;
  const referenceData = payload.reference;
  if (referenceData?.media) {
    const media = referenceData.media || [];
    const photos = media
      .filter((m: any) => m.media_type === "photo")
      .map((m: any) => m.media_url);
    const video = media.find((m: any) => m.media_type === "video")?.media_url;
    referenceData.media_urls =
      photos.length > 0
        ? photos
        : Array.isArray(referenceData.media_urls)
          ? referenceData.media_urls
          : [];
    referenceData.video_url = video || referenceData.video_url;
  }

  return {
    ...payload.link,
    order: payload.order,
    address: payload.address,
    reference: referenceData,
  };
}