import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Establishment from "./pages/Establishment.tsx";
import Checkout from "./pages/Checkout.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Loja from "./pages/Loja.tsx";
import Login from "./pages/Login.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import RecuperarSenha from "./pages/RecuperarSenha.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import MinhaConta from "./pages/MinhaConta.tsx";
import SuporteCliente from "./pages/SuporteCliente.tsx";
import SuporteChatCliente from "./pages/SuporteChatCliente.tsx";
import PedidoCliente from "./pages/PedidoCliente.tsx";
import PedidoDetalhesLoja from "./pages/minha-loja/pedidos/PedidoDetalhes.tsx";
import PedidoTracking from "./pages/PedidoTracking.tsx";
import VisualReference from "./pages/VisualReference.tsx";
import DeliveryReference from "./pages/DeliveryReference.tsx";
import { lazy, Suspense } from "react";
const CatalogDebug = lazy(() => import("./pages/CatalogDebug.tsx"));
const StorageDebug = lazy(() => import("./pages/StorageDebug.tsx"));
const TesteStorage = lazy(() => import("./pages/TesteStorage.tsx"));
const VisualReferenceFallbackTest = lazy(() => import("./pages/VisualReferenceFallbackTest.tsx"));
const IS_DEV = import.meta.env.DEV;


import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AdminEstabelecimentos from "./pages/admin/Estabelecimentos.tsx";
import EstabelecimentoPerfil from "./pages/admin/EstabelecimentoPerfil.tsx";
import AdminAvaliacoes from "./pages/admin/Avaliacoes.tsx";
import AdminDenuncias from "./pages/admin/Denuncias.tsx";
import AdminComunicados from "./pages/admin/Comunicados.tsx";
import AdminSite from "./pages/admin/SiteAdmin.tsx";
import AdminUsuarios from "./pages/admin/Usuarios.tsx";
import AdminAuditoria from "./pages/admin/Auditoria.tsx";
import AdminInteligencia from "./pages/admin/Inteligencia.tsx";
import AdminRelatorios from "./pages/admin/Relatorios.tsx";
import AdminBenchmark from "./pages/admin/Benchmark.tsx";
import AdminPoliticaDados from "./pages/admin/PoliticaDados.tsx";
import AdminPoliticasEntrega from "./pages/admin/PoliticasEntrega.tsx";
import AdminAprovacaoEstabelecimentos from "./pages/admin/AprovacaoEstabelecimentos.tsx";
import AdminTickets from "./pages/admin/Tickets.tsx";
import AdminSuporte from "./pages/admin/Suporte.tsx";
import MinhaLojaDispatcher from "./pages/minha-loja/Dispatcher.tsx";
import MinhaLojaSelecionar from "./pages/minha-loja/Selecionar.tsx";
import MinhaLojaStatus from "./pages/minha-loja/Status.tsx";
import MinhaLojaCadastrar from "./pages/minha-loja/Cadastrar.tsx";
import MinhaLojaPainelLayout from "./pages/minha-loja/PainelLayout.tsx";
import PainelVisaoGeral from "./pages/minha-loja/painel/VisaoGeral.tsx";
import PainelDados from "./pages/minha-loja/painel/DadosLoja.tsx";
import PainelHorarios from "./pages/minha-loja/painel/Horarios.tsx";
import PainelCardapio from "./pages/minha-loja/painel/Cardapio.tsx";
import PainelProdutos from "./pages/minha-loja/painel/Produtos.tsx";
import PainelAdicionais from "./pages/minha-loja/painel/Adicionais.tsx";
import PainelPromocoes from "./pages/minha-loja/painel/Promocoes.tsx";
import PainelEntrega from "./pages/minha-loja/painel/Entrega.tsx";
import PainelPedidos from "./pages/minha-loja/painel/Pedidos.tsx";
import PainelAvaliacoes from "./pages/minha-loja/painel/Avaliacoes.tsx";
import PainelMetricas from "./pages/minha-loja/painel/Metricas.tsx";
import PainelInteligencia from "./pages/minha-loja/painel/Inteligencia.tsx";
import PainelPersonalizacao from "./pages/minha-loja/painel/Personalizacao.tsx";
import PainelPlano from "./pages/minha-loja/painel/PlanoAssinatura.tsx";
import PainelPlanosComparar from "./pages/minha-loja/painel/PlanosComparar.tsx";
import PainelConfiguracoes from "./pages/minha-loja/painel/Configuracoes.tsx";
import PainelFinanceiro from "./pages/minha-loja/painel/Financeiro.tsx";
import PainelEstoque from "./pages/minha-loja/painel/Estoque.tsx";
import PainelMidia from "./pages/minha-loja/painel/Midia.tsx";
import PainelEditarProduto from "./pages/minha-loja/painel/EditarProduto.tsx";
import PainelEquipe from "./pages/minha-loja/painel/Equipe.tsx";
import PainelMotoboys from "./pages/minha-loja/painel/Motoboys.tsx";
import PainelSuporte from "./pages/minha-loja/painel/Suporte.tsx";
import PainelSuporteChat from "./pages/minha-loja/painel/SuporteChat.tsx";
import { Navigate, useLocation } from "react-router-dom";
import { CartFloatingButton } from "./components/CartFloatingButton";
import { SupportChatWidget } from "./components/support/SupportChatWidget";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/loja" element={<Loja />} />
            <Route path="/e/:slug" element={<Establishment />} />
            <Route path="/e/:slug/checkout" element={<Checkout />} />
            <Route path="/loja/:slug" element={<Establishment />} />
            <Route path="/loja/:slug/checkout" element={<Checkout />} />

            <Route path="/painel" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/minha-conta" element={<MinhaConta />} />
            <Route path="/minha-conta/suporte" element={<SuporteCliente />} />
            <Route path="/minha-conta/suporte/chat" element={<SuporteChatCliente />} />
            <Route path="/minha-conta/pedidos/:orderId" element={<PedidoCliente />} />
            <Route path="/pedido/:code" element={<PedidoTracking />} />
            <Route path="/referencia/:token" element={<VisualReference />} />
            <Route path="/referencias-entrega/:token" element={<DeliveryReference />} />
            {IS_DEV && (
              <>
                <Route path="/debug/catalogo" element={<Suspense fallback={null}><CatalogDebug /></Suspense>} />
                <Route path="/debug/storage" element={<Suspense fallback={null}><StorageDebug /></Suspense>} />
                <Route path="/teste-storage" element={<Suspense fallback={null}><TesteStorage /></Suspense>} />
                <Route path="/debug/visual-fallback" element={<Suspense fallback={null}><VisualReferenceFallbackTest /></Suspense>} />
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
                <Route path="/admin/tickets" element={<AdminTickets />} />
                <Route path="/admin/suporte" element={<AdminSuporte />} />
                <Route path="/admin/suporte/chats" element={<AdminSuporte />} />
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
              <Route path="pedidos/:orderId" element={<PedidoDetalhesLoja />} />
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
              <Route path="configuracoes" element={<PainelConfiguracoes />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <GlobalCartButton />
          <GlobalSupportWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
