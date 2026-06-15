import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Users, BarChart3, Mail } from "lucide-react";

const SECTIONS = [
  {
    icon: BarChart3,
    title: "Quais dados coletamos",
    body: [
      "Visitas anônimas ao perfil e ao cardápio.",
      "Cliques em produtos e adições ao carrinho dentro do app.",
      "Cliques no botão de envio do pedido pelo WhatsApp.",
      "Bairro aproximado (quando informado), horário e dia da semana.",
      "Avaliações públicas deixadas pelos clientes.",
    ],
  },
  {
    icon: Lock,
    title: "Para que usamos seus dados",
    body: [
      "Gerar relatórios de desempenho do seu estabelecimento.",
      "Identificar oportunidades de melhoria no cardápio, fotos e horários.",
      "Calcular médias anônimas por categoria para servir como referência.",
      "Enviar comunicados, dicas e campanhas relevantes para o seu negócio.",
    ],
  },
  {
    icon: Users,
    title: "Quem pode acessar",
    body: [
      "O dono do estabelecimento vê suas próprias métricas completas.",
      "A equipe administrativa da plataforma vê dados agregados e métricas individuais para fins de suporte e consultoria.",
      "Outros estabelecimentos nunca veem seus números individuais — apenas médias anônimas da categoria.",
      "Acessos a métricas sensíveis são registrados em log de auditoria.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Como protegemos a privacidade",
    body: [
      "Não exibimos dados pessoais completos de clientes em painéis comerciais.",
      "Telefones aparecem mascarados quando expostos por necessidade operacional.",
      "Comparações com concorrentes usam sempre médias por categoria, região ou porte.",
      "Pedidos enviados ao WhatsApp são estimativas baseadas em cliques — não substituem a confirmação do estabelecimento.",
      "Nunca vendemos ou compartilhamos seus dados sem autorização.",
    ],
  },
  {
    icon: Mail,
    title: "Correção, acesso e remoção de dados",
    body: [
      "Você pode solicitar a correção de qualquer informação cadastral do seu estabelecimento.",
      "Pode pedir a exportação ou exclusão dos dados associados ao seu cadastro, conforme a LGPD.",
      "Entre em contato pelo canal de suporte para abrir uma solicitação.",
    ],
  },
];

export default function PoliticaDados() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" /> Política de Dados para Estabelecimentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transparência sobre o que coletamos, como usamos e como protegemos as informações do seu negócio e dos seus clientes.
        </p>
      </header>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        Nosso painel é uma ferramenta de <strong>gestão e inteligência de mercado</strong>, não de vigilância.
        Os dados existem para ajudar seu estabelecimento a vender mais — sempre respeitando a privacidade de clientes e concorrentes.
      </div>

      {SECTIONS.map((s, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <s.icon className="size-5 text-primary" />{s.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {s.body.map((b, k) => (
                <li key={k} className="flex gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground pt-4 border-t">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}.
      </p>
    </div>
  );
}
