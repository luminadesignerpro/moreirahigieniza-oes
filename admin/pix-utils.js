// ============================================
// PIX-UTILS — gera o código "copia e cola" (BR Code / EMV)
// de um Pix estático, com valor e nome do cliente na descrição.
// Não depende de nenhuma biblioteca externa.
// ============================================

function pixCampo(id, valor) {
  const tamanho = String(valor.length).padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

function pixCRC16(payload) {
  let polinomio = 0x1021;
  let resultado = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    resultado ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((resultado & 0x8000) !== 0) {
        resultado = ((resultado << 1) ^ polinomio) & 0xffff;
      } else {
        resultado = (resultado << 1) & 0xffff;
      }
    }
  }
  return resultado.toString(16).toUpperCase().padStart(4, "0");
}

// Remove acentos e caracteres fora do padrão aceito pelo Pix (ASCII básico)
function pixLimparTexto(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
}

/**
 * Gera o código Pix "copia e cola" (estático).
 * @param {Object} opts
 * @param {string} opts.chave - Chave Pix (CPF, CNPJ, telefone, e-mail ou aleatória)
 * @param {string} opts.nomeRecebedor - Nome de quem recebe (máx. 25 caracteres, sem acento)
 * @param {string} opts.cidade - Cidade de quem recebe (máx. 15 caracteres, sem acento)
 * @param {number} [opts.valor] - Valor em reais (opcional; se omitido, o pagador digita)
 * @param {string} [opts.identificador] - Identificador da cobrança (opcional, até 25 caracteres)
 */
function gerarPixCopiaECola({ chave, nomeRecebedor, cidade, valor, identificador }) {
  const nome = pixLimparTexto(nomeRecebedor).slice(0, 25) || "MOREIRA HIGIENIZACOES";
  const cid = pixLimparTexto(cidade).slice(0, 15) || "FORTALEZA";
  const txid = pixLimparTexto(identificador).slice(0, 25) || "***";

  const merchantAccount =
    pixCampo("00", "br.gov.bcb.pix") + pixCampo("01", chave);

  let payload =
    pixCampo("00", "01") +
    pixCampo("26", merchantAccount) +
    pixCampo("52", "0000") +
    pixCampo("53", "986");

  if (valor && Number(valor) > 0) {
    payload += pixCampo("54", Number(valor).toFixed(2));
  }

  payload +=
    pixCampo("58", "BR") +
    pixCampo("59", nome) +
    pixCampo("60", cid) +
    pixCampo("62", pixCampo("05", txid));

  payload += "6304";
  const crc = pixCRC16(payload);
  return payload + crc;
}
