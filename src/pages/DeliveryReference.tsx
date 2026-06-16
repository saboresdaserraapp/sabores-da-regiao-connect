import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, MapPin, Video, Info, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchReferenceByToken } from "@/lib/referenceLinks";

const DeliveryReferencePage = () => {
  const { token } = useParams();

  const { data: shareLink, isLoading, error } = useQuery({
    queryKey: ["delivery-ref-link", token],
    enabled: !!token,
    queryFn: () => fetchReferenceByToken("delivery", token!),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando referências...</div>;
  
  if (error || !shareLink) return (
    <div className="flex h-screen flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="size-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
        <Clock className="size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Link expirado ou inválido</h2>
        <p className="text-slate-500 max-w-xs mx-auto">
          Por motivos de segurança, este link de referência visual não está mais acessível.
        </p>
      </div>
      <Link to="/" className="text-primary font-bold text-sm underline">Ir para o início</Link>
    </div>
  );

  const { address, reference, order, selected_media_json } = shareLink;
  const selectedMedias = Array.isArray(selected_media_json) ? (selected_media_json as string[]) : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b sticky top-0 z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-500"><ArrowLeft className="size-5" /></Link>
          <h1 className="font-display font-bold text-lg">Entrega: #{order?.tracking_code}</h1>
        </div>
        <meta name="robots" content="noindex, nofollow" />
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            Estas referências são privadas e devem ser usadas apenas para localizar o endereço desta entrega.
          </p>
        </div>

        {/* Endereço */}
        <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold">
            <MapPin className="size-5" />
            <span>Endereço de Entrega</span>
          </div>
          
          <div className="space-y-1">
            <p className="text-lg font-semibold">{address?.street}, {address?.number}</p>
            {address?.complement && <p className="text-slate-600">{address.complement}</p>}
            <p className="text-slate-500">{address?.neighborhood}, {address?.city}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-4 border-t">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cliente</p>
              <p className="font-medium text-sm">{order?.customer_name || "-"}</p>
            </div>
          </div>
        </section>

        {/* Localização Popular e Referência */}
        {(address?.popular_location_name || address?.reference) && (
          <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
            {address?.popular_location_name && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Nome popular da localidade</p>
                <p className="text-slate-700 font-medium text-sm">{address.popular_location_name}</p>
              </div>
            )}
            {address?.reference && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Ponto de referência</p>
                <p className="text-slate-700 font-medium text-sm">{address.reference}</p>
              </div>
            )}
          </section>
        )}

        {/* Referência Visual */}
        {reference && (
          <section className="bg-white rounded-3xl p-5 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-indigo-600 font-bold">
              <Info className="size-5" />
              <span>Instruções Visuais</span>
            </div>

            {Array.isArray(reference.media_urls) && (reference.media_urls as string[]).length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {(reference.media_urls as string[]).map((url: string, i: number) => {
                  // Only show if it's in the selected_media_json or if none selected (fallback to show all)
                  if (selectedMedias.length > 0 && !selectedMedias.includes(url)) return null;
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-2xl overflow-hidden bg-slate-100 border">
                      <img src={url} alt={`Referência ${i+1}`} className="size-full object-cover" />
                    </a>
                  );
                })}
              </div>
            )}

            {reference.video_url && (selectedMedias.length === 0 || selectedMedias.includes(reference.video_url)) && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vídeo de Referência</p>
                <div className="rounded-2xl overflow-hidden bg-black border shadow-sm">
                  <video src={reference.video_url} controls className="w-full aspect-video" />
                </div>
              </div>
            )}

            {reference.instructions && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Como encontrar o local</p>
                <div className="p-4 rounded-2xl bg-slate-50 border text-slate-700 whitespace-pre-line text-sm italic">
                  "{reference.instructions}"
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pins de Referência</p>
              <div className="space-y-2">
                {[1, 2, 3].map(i => {
                  const desc = (reference as any)[`pin_${i}_description`];
                  if (!desc) return null;
                  return (
                    <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="size-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i}</div>
                      <p className="text-sm text-slate-600">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default DeliveryReferencePage;
