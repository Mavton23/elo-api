import { HelpAudience, HelpCategory, HelpType } from '@prisma/client';

export interface SeedArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: HelpCategory;
  type: HelpType;
  audience?: HelpAudience;
  tags: string[];
  featured?: boolean;
  pinned?: boolean;
  readingTime: number;
  content: string;
}

/**
 * Guias oficiais do ELO. Formato: Markdown simples (##, listas com "-", **negrito**),
 * que a app apresenta com tipografia própria.
 */
export const HELP_ARTICLES: SeedArticle[] = [
  {
    slug: 'primeiros-passos',
    title: 'Primeiros passos no ELO',
    excerpt: 'O que é o ELO, o que encontra em cada separador e as regras de utilização.',
    category: 'GERAL', type: 'GUIA_RAPIDO', tags: ['início', 'navegação'], featured: true, pinned: true, readingTime: 3,
    content: `O ELO (Espaço de Ligação Operacional) é a plataforma interna do Ministério do Interior. Junta num só lugar os comunicados oficiais, a rede de colegas, a estrutura orgânica e os serviços que antes exigiam papel.

## Os cinco separadores
- **Início** — o que precisa de tratar hoje, atalhos e os últimos comunicados.
- **Rede** — publicações dos colegas, sempre com um nível de visibilidade.
- **Estrutura** — departamentos, comandos e efetivo.
- **Avisos** — comunicados oficiais, com urgência e confirmação de leitura.
- **Perfil** — o seu cartão de serviço, segurança e definições.

## Regras de utilização
- A conta é pessoal e intransmissível. Nunca partilhe a senha nem os códigos.
- Todas as ações ficam registadas na auditoria.
- As capturas de ecrã estão bloqueadas nas áreas reservadas.
- Informação classificada não se publica na rede interna, mesmo em modo restrito.`,
  },
  {
    slug: 'ativar-conta',
    title: 'Ativar a conta pela primeira vez',
    excerpt: 'Como confirmar a sua identidade com NIP, BI e NUIT e criar a senha.',
    category: 'AUTENTICACAO', type: 'TUTORIAL', tags: ['registo', 'senha', 'primeiro acesso'], featured: true, readingTime: 2,
    content: `Só pode ativar a conta quem consta do registo de efetivos do Ministério.

## Passo a passo
- No ecrã de entrada toque em **Ativar conta**.
- Indique o **NIP**, o número do **BI** e o **NUIT**. Os três têm de coincidir com o registo.
- Crie uma senha com pelo menos 8 caracteres, com maiúsculas, minúsculas e números. Prefira uma frase longa que só você conheça.
- Entre e, logo a seguir, configure o **telemóvel de confiança** em Perfil › Segurança e acesso.

## Se os dados não forem aceites
Confirme os números no BI e no cartão de NUIT. Se continuar a falhar, o seu registo pode estar desatualizado: dirija-se aos Recursos Humanos da sua unidade.`,
  },
  {
    slug: 'entrar-com-seguranca',
    title: 'Entrar com segurança: telemóvel de confiança, autenticador e códigos',
    excerpt: 'O segundo fator do ELO funciona sem SMS nem email. Saiba como configurá-lo.',
    category: 'SEGURANCA', type: 'GUIA_RAPIDO', tags: ['2FA', 'segurança', 'biometria', 'códigos'], featured: true, readingTime: 4,
    content: `Depois da senha, o ELO pede uma segunda confirmação. Não depende de SMS, de email nem de rede móvel.

## Telemóvel de confiança (recomendado)
Em Perfil › Segurança e acesso toque em **Tornar este telemóvel de confiança**. A partir daí, para entrar basta a impressão digital, o rosto ou o PIN do telemóvel. A chave fica guardada no chip seguro do aparelho e nunca sai dele.

## Código de verificação
Ative o **código de verificação** para gerar códigos de 6 dígitos que mudam a cada 30 segundos. Serve para entrar a partir de outro aparelho. Funciona sem rede.

## Códigos de recuperação
São 10 códigos de uso único para quando não tiver o telemóvel. **Escreva-os em papel** e guarde-os num local seguro. Pode gerar novos a qualquer momento — os antigos deixam de funcionar.

## Avisos de entrada
Sempre que a sua conta inicia sessão recebe um aviso em **Avisos**. Se não reconhecer uma entrada, altere a senha de imediato e contacte o administrador.`,
  },
  {
    slug: 'sem-acesso-a-conta',
    title: 'Perdi o telemóvel ou fiquei sem acesso',
    excerpt: 'O que fazer quando não consegue passar do ecrã de verificação.',
    category: 'SEGURANCA', type: 'ARTIGO', tags: ['recuperação', 'bloqueio', 'telemóvel perdido'], featured: true, readingTime: 2,
    content: `## Se tem os códigos de recuperação
No ecrã **Confirmar identidade** escolha **Código de recuperação** e introduza um dos códigos (formato XXXXX-XXXXX). Depois de entrar, gere novos códigos e configure o novo telemóvel.

## Se não tem códigos
Dirija-se ao administrador do ELO da sua unidade com o seu BI. Depois de confirmar presencialmente a identidade, o administrador **repõe o segundo fator** e pode entregar-lhe novos códigos em papel.

## Telemóvel perdido ou roubado
Peça ao administrador para repor o acesso o quanto antes: o telemóvel perdido deixa de servir para entrar na sua conta.

## Esqueci a senha
Por segurança, a senha não é reposta por SMS nem email. O administrador da unidade define uma senha temporária, que terá de alterar na primeira entrada.`,
  },
  {
    slug: 'comunicados-oficiais',
    title: 'Comunicados oficiais e confirmação de leitura',
    excerpt: 'Como ler, confirmar e responder aos comunicados do comando.',
    category: 'NOTIFICACOES', type: 'GUIA_RAPIDO', tags: ['comunicados', 'avisos', 'confirmação'], featured: true, readingTime: 2,
    content: `Os comunicados substituem os grupos informais: têm emissor identificado, urgência e público-alvo definido.

## Ler
O separador **Avisos** mostra os comunicados por ler com um ponto dourado. Use os filtros **Por ler** e **A confirmar** para ver só o que exige ação.

## Confirmar leitura
Alguns comunicados exigem **confirmação de leitura**. Toque em **Confirmar leitura**: fica registada a data e a hora, em seu nome, e o emissor passa a ver que tomou conhecimento.

## Responder ou recusar
Quando o emissor o permite, pode responder por escrito ou indicar que não pode cumprir. A resposta fica no histórico do comunicado.`,
  },
  {
    slug: 'emitir-comunicado',
    title: 'Emitir um comunicado e acompanhar a leitura',
    excerpt: 'Para oficiais e administradores: enviar a um público-alvo e ver quem confirmou.',
    category: 'NOTIFICACOES', type: 'TUTORIAL', audience: 'COMANDANTES', tags: ['emitir', 'comando', 'relatório'], readingTime: 3,
    content: `Podem emitir comunicados os oficiais a partir de **Inspector** e os administradores com essa permissão.

## Enviar
- Em **Avisos** toque em **Novo comunicado**.
- Escreva um título curto e a mensagem.
- Escolha a categoria e a urgência. Reserve **Crítica** para situações que exigem ação imediata.
- Defina o público: toda a instituição, ou só alguns departamentos, províncias ou patentes.
- Ative **Exigir confirmação de leitura** quando precisar de prova de que todos tomaram conhecimento, e indique o prazo.

## Acompanhar
Em **Avisos › Enviados** vê a percentagem de leitura de cada comunicado. Abra-o para ver a lista nominal: quem ainda não leu, quem leu e quem confirmou, com a data e a hora.`,
  },
  {
    slug: 'rede-interna-publicar',
    title: 'Publicar na rede interna e escolher quem vê',
    excerpt: 'Níveis de visibilidade, anexos e boas práticas.',
    category: 'SOCIAL', type: 'GUIA_RAPIDO', tags: ['publicar', 'visibilidade', 'anexos'], readingTime: 3,
    content: `Cada publicação tem um nível de visibilidade, escolhido antes de publicar:
- **Todos os efetivos** — toda a instituição.
- **O meu departamento** — só colegas do seu departamento.
- **A minha unidade** — só colegas da mesma unidade.
- **A minha patente ou superior** — colegas da sua patente para cima.
- **Restrito (comando)** — disponível a partir de Adjunto-Superintendente.

## Anexos
Pode juntar até 5 anexos: fotografias, vídeo ou documentos. Os ficheiros ficam privados e só abrem através de ligações temporárias.

## Boas práticas
- Não publique dados pessoais de terceiros nem informação classificada.
- Use a categoria certa: ajuda os colegas a filtrar.
- Para ordens e instruções formais, use um comunicado, não uma publicação.

Pode guardar publicações para ler mais tarde: toque no marcador e encontre-as em Perfil › Publicações guardadas.`,
  },
  {
    slug: 'prova-de-vida',
    title: 'Prova de vida pelo telemóvel',
    excerpt: 'Como fazer a prova de vida sem se deslocar, quando há uma campanha aberta.',
    category: 'PERFIL', type: 'TUTORIAL', tags: ['prova de vida', 'serviços', 'recursos humanos'], featured: true, readingTime: 2,
    content: `Quando os Recursos Humanos abrem uma campanha de prova de vida, aparece no **Início** em "Para tratar".

## Passo a passo
- Abra **Serviços › Prova de vida**.
- Autorize a localização: confirma que a prova é feita em território nacional.
- Tire uma **fotografia do rosto** no momento, seguindo o gesto pedido no ecrã.
- Envie. O estado passa a **Pendente** até à validação.

## Depois de enviar
Os Recursos Humanos validam ou pedem nova submissão, com a justificação. Recebe o resultado em **Avisos**.`,
  },
  {
    slug: 'atualizar-dados',
    title: 'Atualizar os meus dados',
    excerpt: 'O que muda de imediato e o que é validado pelos Recursos Humanos.',
    category: 'PERFIL', type: 'ARTIGO', tags: ['dados pessoais', 'contactos', 'estado civil'], readingTime: 2,
    content: `Em **Serviços › Atualizar os meus dados** pode manter a sua ficha em dia sem papel.

## Mudam de imediato
Telefone pessoal, morada e contacto de emergência.

## Exigem validação dos Recursos Humanos
Telefone de serviço, email institucional, estado civil e formação. O pedido fica **Pendente** até decisão e pode cancelá-lo enquanto não for analisado.

## Não se alteram aqui
Nome, NIP, BI, NUIT, patente e colocação só mudam por ato administrativo.`,
  },
  {
    slug: 'procurar-efetivos-privacidade',
    title: 'Procurar colegas e proteger o meu perfil',
    excerpt: 'O diretório de efetivos e as opções de privacidade do seu cartão.',
    category: 'MEMBROS', type: 'GUIA_RAPIDO', tags: ['diretório', 'privacidade', 'pesquisa'], readingTime: 2,
    content: `Em **Início › Procurar efetivo** pesquise por nome, unidade ou função e filtre por departamento, patente ou província.

## O que os colegas veem
O cartão profissional: nome, patente, função, unidade e, se o permitir, os contactos de serviço. **BI, NUIT, data de nascimento e NIP nunca são mostrados a colegas.**

## Limitar quem vê o seu perfil
Em **Perfil › Definições › Privacidade** escolha quem pode ver o seu cartão: todo o efetivo, só o seu departamento ou só a sua unidade. Fora desse grupo, os colegas veem apenas o nome e a patente.`,
  },
  {
    slug: 'estrutura-organica',
    title: 'Estrutura orgânica e organograma',
    excerpt: 'Navegar por departamentos e comandos e ver o efetivo de cada um.',
    category: 'HIERARQUIA', type: 'GUIA_RAPIDO', tags: ['estrutura', 'organograma', 'comandos'], readingTime: 1,
    content: `O separador **Estrutura** mostra a organização do Ministério: direção nacional, departamentos e comandos provinciais.

- Toque num ramo para o expandir.
- Filtre por departamento ou província.
- Os números indicam o efetivo de cada estrutura.

A colocação de cada efetivo é mantida pelos administradores. Se a sua estiver errada, informe os Recursos Humanos.`,
  },
  {
    slug: 'admin-validacoes',
    title: 'Validar provas de vida e pedidos de atualização',
    excerpt: 'Para Recursos Humanos: decidir pedidos pendentes com justificação.',
    category: 'ADMINISTRACAO', type: 'TUTORIAL', audience: 'ADMINISTRADORES', tags: ['validações', 'RH', 'prova de vida'], readingTime: 2,
    content: `Em **Serviços › Validações pendentes** estão as provas de vida e os pedidos de atualização a aguardar decisão.

- Abra o pedido e confira a fotografia, a localização ou os valores propostos.
- **Aprovar** aplica a alteração à ficha do efetivo.
- **Rejeitar** exige uma justificação, que o efetivo recebe em Avisos.

Não pode validar pedidos seus. Cada decisão fica registada na auditoria com o seu nome.`,
  },
  {
    slug: 'admin-campanhas-prova-de-vida',
    title: 'Abrir uma campanha de prova de vida',
    excerpt: 'Definir o período e o público e acompanhar o cumprimento.',
    category: 'ADMINISTRACAO', type: 'TUTORIAL', audience: 'ADMINISTRADORES', tags: ['campanha', 'prova de vida', 'cumprimento'], readingTime: 2,
    content: `As provas de vida só são aceites dentro de uma campanha.

## Criar
- Abra **Administração › Campanhas de prova de vida** e toque em **Nova campanha**.
- Indique o título, as datas de início e fim e, se quiser, os departamentos ou províncias abrangidos.

## Acompanhar
Abra a campanha para ver quantos efetivos já submeteram, quantos foram aprovados e quem está em falta. Pode encerrar a campanha a qualquer momento.`,
  },
  {
    slug: 'admin-repor-acesso',
    title: 'Repor o acesso de um efetivo',
    excerpt: 'Senha temporária, reposição do segundo fator e códigos de recuperação.',
    category: 'ADMINISTRACAO', type: 'TUTORIAL', audience: 'ADMINISTRADORES', tags: ['acesso', '2FA', 'senha'], readingTime: 2,
    content: `Faça-o **apenas presencialmente**, depois de confirmar a identidade com o BI.

- Abra **Administração › Utilizadores** e escolha o efetivo.
- **Repor segundo fator** remove o telemóvel de confiança, o autenticador e os códigos antigos. O efetivo volta a configurar tudo na próxima entrada.
- **Definir senha temporária** obriga o efetivo a trocá-la ao entrar.

Não é possível repor o seu próprio acesso: peça a outro administrador. Para o administrador principal existe o comando de servidor \`pnpm admin:recovery-codes <NIP>\`.`,
  },
];

export const HELP_FAQS: { question: string; answer: string; category: HelpCategory; tags: string[]; featured?: boolean }[] = [
  { question: 'O ELO precisa de SMS ou de dados móveis para eu entrar?', answer: 'Não. O telemóvel de confiança e o código de verificação funcionam sem SMS e sem rede. O SMS/email é apenas um último recurso.', category: 'SEGURANCA', tags: ['2FA'], featured: true },
  { question: 'Perdi os códigos de recuperação. E agora?', answer: 'Se ainda consegue entrar, gere novos em Perfil › Segurança e acesso — os antigos deixam de funcionar. Se não consegue entrar, dirija-se ao administrador da sua unidade com o BI.', category: 'SEGURANCA', tags: ['recuperação'], featured: true },
  { question: 'Porque não consigo tirar capturas de ecrã?', answer: 'As áreas reservadas do ELO bloqueiam capturas e gravações de ecrã para evitar fugas de informação.', category: 'SEGURANCA', tags: ['sigilo'] },
  { question: 'Os meus colegas veem o meu BI ou NUIT?', answer: 'Não. Os colegas veem apenas o cartão profissional. Os dados pessoais só são visíveis para si e para os administradores autorizados.', category: 'MEMBROS', tags: ['privacidade'], featured: true },
  { question: 'Quem pode emitir comunicados?', answer: 'Oficiais a partir de Inspector e administradores com permissão para comunicados.', category: 'NOTIFICACOES', tags: ['comunicados'] },
  { question: 'O que acontece quando confirmo a leitura de um comunicado?', answer: 'Fica registada a data e a hora, em seu nome. O emissor vê no relatório que tomou conhecimento.', category: 'NOTIFICACOES', tags: ['confirmação'] },
  { question: 'Não vejo a prova de vida no Início. Porquê?', answer: 'A prova de vida só fica disponível quando os Recursos Humanos abrem uma campanha que o abrange. Fora disso, não há nada a fazer.', category: 'PERFIL', tags: ['prova de vida'] },
  { question: 'Posso mudar a minha patente ou unidade no ELO?', answer: 'Não. Patente e colocação só mudam por ato administrativo e são atualizadas pelos Recursos Humanos.', category: 'PERFIL', tags: ['dados'] },
  { question: 'A sessão terminou sozinha. É normal?', answer: 'Sim. Por segurança, a sessão termina após algum tempo com a app em segundo plano. Volte a entrar com a senha e o segundo fator.', category: 'AUTENTICACAO', tags: ['sessão'] },
  { question: 'Recebi um aviso de entrada que não reconheço.', answer: 'Altere a senha de imediato em Perfil › Segurança e acesso, termine as sessões nos outros aparelhos e informe o administrador da sua unidade.', category: 'SEGURANCA', tags: ['intrusão'], featured: true },
];
