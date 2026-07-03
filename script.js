// ============================================
// SCRIPT PRINCIPAL — SITE PÚBLICO
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  ligarBotoesWhatsApp();
  ativarRevealScroll();
  carregarGaleria();
});

// --------------------------------------------
// Liga todos os botões de WhatsApp ao número do config.js
// --------------------------------------------
function ligarBotoesWhatsApp() {
  const botoes = [
    "btnHeaderWhats",
    "btnHeroWhats",
    "btnCtaWhats",
    "footerWhats",
    "floatWhats"
  ];
  botoes.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = montarLinkWhatsApp();
  });
}

// --------------------------------------------
// Animação simples de revelar elementos ao rolar a página
// --------------------------------------------
function ativarRevealScroll() {
  const elementos = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visible");
          observer.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  elementos.forEach((el) => observer.observe(el));
}

// --------------------------------------------
// Carrega fotos da galeria a partir do Supabase
// (cai de volta nos placeholders se não houver fotos ainda)
// --------------------------------------------
async function carregarGaleria() {
  const grid = document.getElementById("galleryGrid");
  if (!grid || typeof getSupabaseClient !== "function") return;

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("galeria")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(6);

    if (error) throw error;
    if (!data || data.length === 0) return; // mantém as imagens padrão do HTML

    grid.innerHTML = "";
    data.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "gallery-item reveal visible" + (index === 0 || index === 3 ? " tall" : "");

      const eVideo = item.tipo === 'video';
      if (eVideo) {
        div.innerHTML = `
          <video src="${item.url}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>
          <div class="gallery-item-label" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(11,37,69,0.7),transparent);color:white;padding:10px 12px;font-size:0.75rem;">
            ${item.descricao || ''}
          </div>
          <div style="position:absolute;top:8px;right:8px;background:rgba(11,37,69,0.75);color:white;font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:4px;">▶ VÍDEO</div>
        `;
      } else {
        div.innerHTML = `<img src="${item.url}" alt="${item.descricao || 'Antes e depois Moreira Higienizações'}" loading="lazy"><div class="gallery-item-label">${item.descricao || ''}</div>`;
      }
      grid.appendChild(div);
    });

  } catch (err) {
    console.warn("Galeria: usando imagens padrão (Supabase ainda não configurado ou vazio).", err);
  }
}
