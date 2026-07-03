// ============================================
// SIDEBAR — injetada em todas as páginas do admin
// ============================================

const MENU_ITEMS = [
  { id: "dashboard", icon: "📊", label: "Dashboard", href: "dashboard.html" },
  { id: "agendamentos", icon: "🗓️", label: "Agendamentos", href: "agendamentos.html" },
  { id: "clientes", icon: "👥", label: "Clientes", href: "clientes.html" },
  { id: "financeiro", icon: "💰", label: "Financeiro", href: "financeiro.html" },
  { id: "galeria", icon: "🖼️", label: "Galeria do Site", href: "galeria.html" },
  { id: "bot", icon: "💬", label: "WhatsApp Bot", href: "bot.html" }
];

function montarSidebar(paginaAtiva) {
  const sidebarHTML = `
    <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu">☰</button>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <img src="../assets/banner-marca.jpg" alt="Moreira Higienizações">
        <div>
          <h1>Moreira</h1>
          <span>Painel Admin</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${MENU_ITEMS.map(
          (item) => `
          <a href="${item.href}" class="nav-item ${item.id === paginaAtiva ? "active" : ""}" data-nav-id="${item.id}">
            <span class="icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.id === "agendamentos" ? '<span class="nav-badge" id="badgeAgendamentosPendentes" style="display:none;">0</span>' : ""}
          </a>`
        ).join("")}
      </nav>
      <div class="sidebar-footer">
        <a href="login.html" class="nav-item logout" id="btnLogoutSidebar">
          <span class="icon">🚪</span>
          <span>Sair</span>
        </a>
      </div>
    </aside>
  `;
  document.body.insertAdjacentHTML("afterbegin", sidebarHTML);

  const toggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  const btnLogout = document.getElementById("btnLogoutSidebar");
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      sessionStorage.removeItem("moreira_admin_usuario");
      window.location.href = "login.html";
    });
  }

  atualizarBadgeAgendamentosPendentes();
}

async function atualizarBadgeAgendamentosPendentes() {
  const badge = document.getElementById("badgeAgendamentosPendentes");
  if (!badge) return;
  try {
    const agendamentos = await listarAgendamentos({ status: STATUS_AGENDAMENTO.AGENDADO });
    if (agendamentos.length > 0) {
      badge.textContent = agendamentos.length;
      badge.style.display = "inline-flex";
    }
  } catch (err) {
    // silencioso — banco pode ainda não estar configurado
  }
}

// Protege as páginas do admin: redireciona para login se não houver sessão
function protegerPagina() {
  const sessao = sessionStorage.getItem("moreira_admin_usuario");
  if (!sessao) {
    window.location.href = "login.html";
  }
}
