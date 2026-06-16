import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, MapPin, Video, Info, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchReferenceByToken } from "@/lib/referenceLinks";

const VisualReferencePage = () => {
  const { token } = useParams();

  const { data: refLink, isLoading } = useQuery({
    queryKey: ["visual-ref-link", token],
    enabled: !!token,
    queryFn: () => fetchReferenceByToken("visual", token!),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!refLink) return (
    <div className="flex h-screen flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="size-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
        <Clock className="size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">Link expirado ou inválido</h2>
        <p className="text-slate-500 max-w-xs mx-auto">
          Por motivos de segurança, este link de referência visual não está mais acessível ou nunca existiu.
        </p>
      </div>
      <Link to="/" className="text-primary font-bold text-sm underline">Voltar para o início</Link>
    </div>
  );

  const { address, reference, order } = refLink;
  const selectedMedias: string[] = [];
  const customerPhoneDigits = (order?.customer_phone || "").replace(/\D/g, "");
  const waLink = customerPhoneDigits
    ? `https://wa.me/${customerPhoneDigits}?text=${encodeURIComponent(
        `Olá, ${order?.customer_name || ""}! Sou da entrega do pedido #${order?.tracking_code || ""}.`,
      )}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b sticky top-0 z-10 p-4 flex items-center gap-3">
        <Link to="/" className="text-slate-500"><ArrowLeft className="size-5" /></Link>
        <h1 className="font-display font-bold text-lg">Referências: #{order?.tracking_code}</h1>
        <meta name="robots" content="noindex, nofollow" />
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Endereço */}
        <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold">
            <MapPin className="size-5" />
            <span>{address?.label || "Endereço de Entrega"}</span>
          </div>
          
          <div className="space-y-1">
            <p className="text-lg font-semibold">{address?.street}, {address?.number}</p>
            {address?.complement && <p className="text-slate-600">{address.complement}</p>}
            <p className="text-slate-500">{address?.neighborhood}, {address?.city}</p>
            {address?.zip && <p className="text-slate-400 text-sm">CEP: {address.zip}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cliente</p>
              <p className="font-medium">{order?.customer_name || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Telefone</p>
              <p className="font-medium">{order?.customer_phone || "-"}</p>
            </div>
          </div>

          {waLink && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a
                href={`tel:${customerPhoneDigits}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Phone className="size-4" /> Ligar
              </a>
            </div>
          )}
        </section>

        {/* Localização Popular e Referência */}
        {(address?.popular_location_name || address?.reference) && (
          <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
            {address?.popular_location_name && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Nome popular da localidade</p>
                <p className="text-slate-700 font-medium">{address.popular_location_name}</p>
              </div>
            )}
            {address?.reference && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Ponto de referência</p>
                <p className="text-slate-700 font-medium">{address.reference}</p>
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
                  if (selectedMedias.length > 0 && !selectedMedias.includes(url)) return null;
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-2xl overflow-hidden bg-slate-100 border">
                      <img src={url} alt={`Referência ${i+1}`} className="size-full object-cover" />
                    </a>
                  );
                })}
              </div>
            )}

            {reference.video_url && (!selectedMedias.length || selectedMedias.includes(reference.video_url)) && (
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

            {reference.updated_at && (
              <div className="pt-4 border-t flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>Atualizado em {new Date(reference.updated_at).toLocaleDateString()}</span>
                </div>
                <span>Apenas para facilitar a entrega</span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default VisualReferencePage;
