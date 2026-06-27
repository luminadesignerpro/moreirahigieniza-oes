// ============================================
// CONFIGURAÇÃO DO SITE — MOREIRA HIGIENIZAÇÕES
// Edite este arquivo para trocar número, preços
// e textos sem precisar tocar no resto do código.
// ============================================

const CONFIG = {
  // Número de WhatsApp no formato internacional (sem espaços, sem +)
  whatsappNumero: "5585989002147",

  // Mensagem padrão enviada ao clicar nos botões de WhatsApp do site
  mensagemPadrao: "Olá! Vim pelo site e quero pedir um orçamento de higienização 🧼",

  // Tabela de preços usada no simulador (valores em reais)
  precos: {
    sofa: {
      2: 120,
      3: 170,
      4: 220,
      5: 280
    },
    colchao: {
      base: 90,
      observacao: "Valor pode variar conforme tamanho (solteiro, casal, queen, king)."
    },
    poltrona: {
      base: 70,
      observacao: "Valor por poltrona."
    },
    tapete: {
      base: 0,
      observacao: "Valor calculado conforme tamanho — fale com a gente pelo WhatsApp."
    }
  }
};

// Liga os botões de WhatsApp do site ao número configurado acima
function montarLinkWhatsApp(mensagem) {
  const texto = encodeURIComponent(mensagem || CONFIG.mensagemPadrao);
  return `https://wa.me/${CONFIG.whatsappNumero}?text=${texto}`;
}
