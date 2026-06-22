import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useParams, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Public essentials — keep eager so the first paint is instant
import Index from "./pages/Index.tsx";
import Loja from "./pages/Loja.tsx";
import Establishment from "./pages/Establishment.tsx";
import NotFound from "./pages/NotFound.tsx";
import { RedirectByOrderId } from "./components/RedirectByOrderId";

// Auth (lightweight, lazy is fine)
const Login = lazy(() => import("./pages/Login.tsx"));
const Cadastro = lazy(() => import("./pages/Cadastro.tsx"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));

// Checkout & customer area
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const MinhaConta = lazy(() => import("./pages/MinhaConta.tsx"));
const SuporteCliente = lazy(() => import("./pages/SuporteCliente.tsx"));
const SuporteChatCliente = lazy(() => import("./pages/SuporteChatCliente.tsx"));
const TicketDetalhesCliente = lazy(() => import("./pages/TicketDetalhesCliente.tsx"));
const PedidoTracking = lazy(() => import("./pages/PedidoTracking.tsx"));
const VisualReference = lazy(() => import("./pages/VisualReference.tsx"));
const DeliveryReference = lazy(() => import("./pages/DeliveryReference.tsx"));
const Privacidade = lazy(() => import("./pages/Privacidade.tsx"));

const CatalogDebug = lazy(() => import("./pages/CatalogDebug.tsx"));
const StorageDebug = lazy(() => import("./pages/StorageDebug.tsx"));
const TesteStorage = lazy(() => import("./pages/TesteStorage.tsx"));
const VisualReferenceFallbackTest = lazy(() => import("./pages/VisualReferenceFallbackTest.tsx"));
const IS_DEV = import.meta.env.DEV;

function EstablishmentRedirect({ checkout = false }: { checkout?: boolean }) {
  const { slug } = useParams<{ slug: string }>();
  const { search, hash } = useLocation();
  const target = `/loja/${slug}${checkout ? "/checkout" : ""}${search}${hash}`;
  return <Navigate to={target} replace />;
}


import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import AdminLayout from "@/components/admin/AdminLayout";

// Admin — fully lazy
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard.tsx"));
const AdminEstabelecimentos = lazy(() => import("./pages/admin/Estabelecimentos.tsx"));
const EstabelecimentoPerfil = lazy(() => import("./pages/admin/EstabelecimentoPerfil.tsx"));
const AdminAvaliacoes = lazy(() => import("./pages/admin/Avaliacoes.tsx"));
const AdminDenuncias = lazy(() => import("./pages/admin/Denuncias.tsx"));
const AdminComunicados = lazy(() => import("./pages/admin/Comunicados.tsx"));
const AdminSite = lazy(() => import("./pages/admin/SiteAdmin.tsx"));
const AdminUsuarios = lazy(() => import("./pages/admin/Usuarios.tsx"));
const AdminAuditoria = lazy(() => import("./pages/admin/Auditoria.tsx"));
const AdminInteligencia = lazy(() => import("./pages/admin/Inteligencia.tsx"));
const AdminRelatorios = lazy(() => import("./pages/admin/Relatorios.tsx"));
const AdminBenchmark = lazy(() => import("./pages/admin/Benchmark.tsx"));
const AdminPoliticaDados = lazy(() => import("./pages/admin/PoliticaDados.tsx"));
const AdminPoliticasEntrega = lazy(() => import("./pages/admin/PoliticasEntrega.tsx"));
const AdminAprovacaoEstabelecimentos = lazy(() => import("./pages/admin/AprovacaoEstabelecimentos.tsx"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets.tsx"));
const AdminSuporte = lazy(() => import("./pages/admin/Suporte.tsx"));

// Minha Loja — fully lazy
const MinhaLojaDispatcher = lazy(() => import("./pages/minha-loja/Dispatcher.tsx"));
const MinhaLojaSelecionar = lazy(() => import("./pages/minha-loja/Selecionar.tsx"));
const MinhaLojaStatus = lazy(() => import("./pages/minha-loja/Status.tsx"));
const MinhaLojaCadastrar = lazy(() => import("./pages/minha-loja/Cadastrar.tsx"));
const MinhaLojaPainelLayout = lazy(() => import("./pages/minha-loja/PainelLayout.tsx"));
const PainelVisaoGeral = lazy(() => import("./pages/minha-loja/painel/VisaoGeral.tsx"));
const PainelDados = lazy(() => import("./pages/minha-loja/painel/DadosLoja.tsx"));
const PainelHorarios = lazy(() => import("./pages/minha-loja/painel/Horarios.tsx"));
const PainelCardapio = lazy(() => import("./pages/minha-loja/painel/Cardapio.tsx"));
const PainelProdutos = lazy(() => import("./pages/minha-loja/painel/Produtos.tsx"));
const PainelAdicionais = lazy(() => import("./pages/minha-loja/painel/Adicionais.tsx"));
const PainelPromocoes = lazy(() => import("./pages/minha-loja/painel/Promocoes.tsx"));
const PainelEntrega = lazy(() => import("./pages/minha-loja/painel/Entrega.tsx"));
const PainelPedidos = lazy(() => import("./pages/minha-loja/painel/Pedidos.tsx"));
const PainelAvaliacoes = lazy(() => import("./pages/minha-loja/painel/Avaliacoes.tsx"));
const PainelMetricas = lazy(() => import("./pages/minha-loja/painel/Metricas.tsx"));
const PainelInteligencia = lazy(() => import("./pages/minha-loja/painel/Inteligencia.tsx"));
const PainelPersonalizacao = lazy(() => import("./pages/minha-loja/painel/Personalizacao.tsx"));
const PainelPlano = lazy(() => import("./pages/minha-loja/painel/PlanoAssinatura.tsx"));
const PainelPlanosComparar = lazy(() => import("./pages/minha-loja/painel/PlanosComparar.tsx"));
const PainelConfiguracoes = lazy(() => import("./pages/minha-loja/painel/Configuracoes.tsx"));
const PainelFinanceiro = lazy(() => import("./pages/minha-loja/painel/Financeiro.tsx"));
const PainelEstoque = lazy(() => import("./pages/minha-loja/painel/Estoque.tsx"));
const PainelMidia = lazy(() => import("./pages/minha-loja/painel/Midia.tsx"));
const PainelEditarProduto = lazy(() => import("./pages/minha-loja/painel/EditarProduto.tsx"));
const PainelEquipe = lazy(() => import("./pages/minha-loja/painel/Equipe.tsx"));
const PainelMotoboys = lazy(() => import("./pages/minha-loja/painel/Motoboys.tsx"));
const PainelSuporte = lazy(() => import("./pages/minha-loja/painel/Suporte.tsx"));
const PainelSuporteChat = lazy(() => import("./pages/minha-loja/painel/SuporteChat.tsx"));
const PainelTicketDetalhes = lazy(() => import("./pages/minha-loja/painel/TicketDetalhes.tsx"));

import { CartFloatingButton } from "./components/CartFloatingButton";
import { SupportChatWidget } from "./components/support/SupportChatWidget";
import { PendingProposalDialog } from "./components/PendingProposalDialog";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
    </div>
  );
}

function GlobalCartButton() {
  const { pathname } = useLocation();
  if (/\/checkout(\/|$)/.test(pathname)) return null;
  const allowed =
    pathname === "/" ||
    pathname === "/loja" ||
    /^\/loja\//.test(pathname) ||
    /^\/e\//.test(pathname) ||
    /^\/categoria(\/|$)/.test(pathname);
  if (!allowed) return null;
  return <CartFloatingButton />;
}

function GlobalSupportWidget() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;
  if (/^\/admin(\/|$)/.test(pathname)) return null;
  if (/^\/minha-loja(\/|$)/.test(pathname)) return null;
  if (/^\/checkout(\/|$)/.test(pathname)) return null;
  return <SupportChatWidget />;
}

function GlobalPendingProposal() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;
  if (/^\/admin(\/|$)/.test(pathname)) return null;
  if (/^\/minha-loja(\/|$)/.test(pathname)) return null;
  return <PendingProposalDialog />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/loja" element={<Loja />} />
            <Route path="/e/:slug" element={<EstablishmentRedirect />} />
            <Route path="/e/:slug/checkout" element={<EstablishmentRedirect checkout />} />
            <Route path="/loja/:slug" element={<Establishment />} />
            <Route path="/loja/:slug/checkout" element={<Checkout />} />

            <Route path="/painel" element={<Navigate to="/minha-loja" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/minha-conta" element={<MinhaConta />} />
            <Route path="/minha-conta/suporte" element={<SuporteCliente />} />
            <Route path="/minha-conta/suporte/chat" element={<SuporteChatCliente />} />
            <Route path="/minha-conta/suporte/tickets" element={<SuporteCliente />} />
            <Route path="/minha-conta/suporte/tickets/:ticketId" element={<TicketDetalhesCliente />} />
            <Route path="/minha-conta/pedidos/:orderId" element={<RedirectByOrderId />} />
            <Route path="/pedido/:code" element={<PedidoTracking />} />
            <Route path="/referencia/:token" element={<VisualReference />} />
            <Route path="/referencias-entrega/:token" element={<DeliveryReference />} />
            <Route path="/privacidade" element={<Privacidade />} />
            {IS_DEV && (
              <>
                <Route path="/debug/catalogo" element={<CatalogDebug />} />
                <Route path="/debug/storage" element={<StorageDebug />} />
                <Route path="/teste-storage" element={<TesteStorage />} />
                <Route path="/debug/visual-fallback" element={<VisualReferenceFallbackTest />} />
              </>
            )}


            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<ProtectedAdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/estabelecimentos" element={<AdminEstabelecimentos />} />
                <Route path="/admin/estabelecimentos/:id" element={<EstabelecimentoPerfil />} />
                <Route path="/admin/avaliacoes" element={<AdminAvaliacoes />} />
                <Route path="/admin/denuncias" element={<AdminDenuncias />} />
                <Route path="/admin/comunicados" element={<AdminComunicados />} />
                <Route path="/admin/site" element={<AdminSite />} />
                <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                <Route path="/admin/auditoria" element={<AdminAuditoria />} />
                <Route path="/admin/inteligencia" element={<AdminInteligencia />} />
                <Route path="/admin/relatorios" element={<AdminRelatorios />} />
                <Route path="/admin/relatorios/:id" element={<AdminRelatorios />} />
                <Route path="/admin/benchmark" element={<AdminBenchmark />} />
                <Route path="/admin/politica-dados" element={<AdminPoliticaDados />} />
                <Route path="/admin/politicas-entrega" element={<AdminPoliticasEntrega />} />
                <Route path="/admin/aprovacao-estabelecimentos" element={<AdminAprovacaoEstabelecimentos />} />
                <Route path="/admin/tickets" element={<Navigate to="/admin/suporte/tickets" replace />} />
                <Route path="/admin/tickets/:ticketId" element={<Navigate to="/admin/suporte/tickets" replace />} />
                <Route path="/admin/suporte/tickets" element={<AdminTickets />} />
                <Route path="/admin/suporte/tickets/:ticketId" element={<AdminTickets />} />
                <Route path="/admin/suporte" element={<Navigate to="/admin/suporte/chats" replace />} />
                <Route path="/admin/suporte/chats" element={<AdminSuporte />} />
                <Route path="/admin/suporte/chats/:chatId" element={<AdminSuporte />} />
              </Route>
            </Route>

            <Route path="/minha-loja" element={<MinhaLojaDispatcher />} />
            <Route path="/minha-loja/selecionar" element={<MinhaLojaSelecionar />} />
            <Route path="/minha-loja/status" element={<MinhaLojaStatus />} />
            <Route path="/minha-loja/cadastrar" element={<MinhaLojaCadastrar />} />
            <Route path="/minha-loja/:id/painel" element={<Navigate to=".." relative="path" replace />} />
            <Route path="/minha-loja/:establishmentId" element={<MinhaLojaPainelLayout />}>
              <Route index element={<PainelVisaoGeral />} />
              <Route path="dados" element={<PainelDados />} />
              <Route path="horarios" element={<PainelHorarios />} />
              <Route path="cardapio" element={<PainelCardapio />} />
              <Route path="produtos" element={<PainelProdutos />} />
              <Route path="produtos/:productId/editar" element={<PainelEditarProduto />} />
              <Route path="adicionais" element={<PainelAdicionais />} />
              <Route path="promocoes" element={<PainelPromocoes />} />
              <Route path="entrega" element={<PainelEntrega />} />
              <Route path="pedidos" element={<PainelPedidos />} />
              <Route path="pedidos/:orderId" element={<RedirectByOrderId />} />
              <Route path="avaliacoes" element={<PainelAvaliacoes />} />
              <Route path="metricas" element={<PainelMetricas />} />
              <Route path="inteligencia" element={<PainelInteligencia />} />
              <Route path="personalizacao" element={<PainelPersonalizacao />} />
              <Route path="plano" element={<PainelPlano />} />
              <Route path="planos" element={<PainelPlanosComparar />} />
              <Route path="financeiro" element={<PainelFinanceiro />} />
              <Route path="estoque" element={<PainelEstoque />} />
              <Route path="midia" element={<PainelMidia />} />
              <Route path="equipe" element={<PainelEquipe />} />
              <Route path="motoboys" element={<PainelMotoboys />} />
              <Route path="suporte" element={<PainelSuporte />} />
              <Route path="suporte/chat" element={<PainelSuporteChat />} />
              <Route path="suporte/tickets" element={<PainelSuporte />} />
              <Route path="suporte/tickets/:ticketId" element={<PainelTicketDetalhes />} />
              <Route path="configuracoes" element={<PainelConfiguracoes />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <GlobalCartButton />
          <GlobalSupportWidget />
          <GlobalPendingProposal />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
