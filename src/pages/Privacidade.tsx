import { Link } from "react-router-dom";

export default function Privacidade() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacidade e Confiança</h1>
      <p className="text-muted-foreground mb-8">
        Última atualização: 18/06/2026
      </p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-2">Quais dados coletamos</h2>
          <p>
            Coletamos apenas os dados necessários para você fazer pedidos e receber suporte:
            nome, telefone, e-mail, endereço de entrega e histórico de pedidos. Quando você
            envia mensagens ou anexos, eles ficam vinculados ao pedido ou ticket
            correspondente.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Como usamos seus dados</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Processar e entregar seus pedidos junto aos estabelecimentos.</li>
            <li>Permitir que você acompanhe pedidos e converse com a loja.</li>
            <li>Oferecer suporte e resolver problemas reportados.</li>
            <li>Aprimorar a plataforma com métricas agregadas e anônimas.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Com quem compartilhamos</h2>
          <p>
            Compartilhamos apenas o necessário com o estabelecimento que você escolheu para
            cumprir o pedido. Não vendemos dados pessoais. Provedores de infraestrutura
            (hospedagem, e-mail) seguem contratos de confidencialidade.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Segurança</h2>
          <p>
            Aplicamos controles de acesso por papel (cliente, equipe da loja, suporte e
            administração), autenticação obrigatória e regras a nível de banco de dados para
            que cada usuário só veja o que lhe pertence. Anexos de chat e suporte são
            servidos por URLs assinadas e temporárias.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Seus direitos (LGPD)</h2>
          <p>
            Você pode solicitar a qualquer momento acesso, correção, portabilidade ou
            exclusão dos seus dados, além de revogar consentimentos. Basta entrar em
            contato pelo suporte do app ou pelo e-mail abaixo.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Contato</h2>
          <p>
            Dúvidas sobre privacidade:{" "}
            <a className="underline" href="mailto:saboresdaserraapp@gmail.com">
              saboresdaserraapp@gmail.com
            </a>
          </p>
        </div>

        <div className="pt-4">
          <Link to="/" className="underline text-primary">
            ← Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}