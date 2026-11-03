/* Painel executivo DIN · FUNPEC
   Lê: window.JIRA_DATA (data/jira.js), window.PARCEIROS / PROJETOS / VOCAB (data/parceiros.js),
       window.__FUNPEC_LABS_DATA__ (data/labs.js), window.INDICADORES / EIXOS (data/indicadores.js). */
(function () {
  "use strict";

  /* ---------------- utilidades ---------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* armazenamento indisponível */ } }
  };
  const HOJE = new Date(); HOJE.setHours(0, 0, 0, 0);
  const parseDia = (iso) => { if (!iso) return null; const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
  const dias = (iso) => { const d = parseDia(iso); return d ? Math.round((d - HOJE) / 864e5) : null; };
  const fmtDia = (iso) => { const d = parseDia(iso); return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "") : "sem prazo"; };
  const fmtNum = (n, tipo) => {
    if (n == null || isNaN(n)) return "—";
    if (tipo === "R$") return n >= 1e6 ? "R$ " + (n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi" : n >= 1e3 ? "R$ " + (n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil" : "R$ " + n.toLocaleString("pt-BR");
    if (tipo === "%") return n.toLocaleString("pt-BR") + "%";
    return n.toLocaleString("pt-BR");
  };
  const REDUZIR = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- tema ---------------- */
  const temaSalvo = store.get("din-tema", null);
  if (temaSalvo) document.documentElement.setAttribute("data-theme", temaSalvo);
  $("#themeBtn").addEventListener("click", () => {
    const atual = document.documentElement.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const novo = atual === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", novo);
    store.set("din-tema", novo);
  });

  /* ---------------- dados do Jira ---------------- */
  const JIRA = window.JIRA_DATA || { cards: [], base: "#" };
  const FRENTES = {
    captacao: { nome: "Captação e submissão", desc: "FINEP, BNDES com CETIQT, radar de editais e equipe de submissão." },
    pdi: { nome: "PD&I com empresas", desc: "Cristália, carteira corporativa e oportunidades abertas nos fóruns." },
    parcerias: { nome: "Parcerias e alianças", desc: "CETENE, SENAI CIMATEC, NPAD, LabCIM e fundações parceiras." },
    portfolio: { nome: "Portfólio e investidores", desc: "Laboratórios, deep techs, fundos e a base de ativos da UFRN." },
    dados: { nome: "Dados e transformação digital", desc: "TD da FUNPEC, IA aplicada, SEMURB e este painel." },
    ict: { nome: "ICT FUNPEC", desc: "Modelo de ICT, Política de Inovação e NIT misto com a AGIR." },
    institucional: { nome: "Demandas institucionais", desc: "CEBAS, SBPC, ICMBio, UFPB, Inmetro e norma de cargos." },
    programas: { nome: "Programas legados", desc: "FunHUB, ETEC, Marketplace, Catalisa GOV e Conecta." },
    gestao: { nome: "Gestão da área", desc: "Kickoff, processo seletivo, Manual e reporte à Presidência." }
  };
  const RESP = { diretor: "Diretor", gerente: "Gerente", analista: "Analista de captação" };
  const cards = (JIRA.cards || []).map((c) => {
    const frente = (c.labels.find((l) => l.startsWith("frente-")) || "frente-gestao").slice(7);
    const resp = c.labels.filter((l) => l.startsWith("resp-")).map((l) => l.slice(5));
    const d = dias(c.due);
    const feito = c.cat === "done";
    const titulo = c.summary.replace(/^\[[^\]]+\]\s*/, "");
    return Object.assign({}, c, { frente, resp, d, feito, titulo,
      atrasado: !feito && d != null && d < 0,
      prioridade: c.labels.includes("prioridade-alta"),
      heranca: c.labels.includes("heranca") });
  });
  const estado = (c) => c.feito ? ["ok", "Concluído"] : c.atrasado ? ["late", "Vencido"] : c.cat === "indeterminate" ? ["ip", "Em andamento"] : ["td", "A iniciar"];
  const prazoPill = (c) => {
    if (c.feito || c.d == null) return "";
    if (c.d < 0) return `<span class="pill late">${-c.d} d de atraso</span>`;
    if (c.d === 0) return `<span class="pill soon">Hoje</span>`;
    if (c.d <= 7) return `<span class="pill soon">em ${c.d} d</span>`;
    return `<span class="pill ghost">${fmtDia(c.due)}</span>`;
  };

  /* ---------------- markdown simples (descrições do Jira) ---------------- */
  function md(txt) {
    const linhas = String(txt || "").split("\n");
    let html = "", lista = false;
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    linhas.forEach((l) => {
      const t = l.trim();
      if (/^[*-]\s+/.test(t)) { if (!lista) { html += "<ul>"; lista = true; } html += "<li>" + inline(t.replace(/^[*-]\s+/, "")) + "</li>"; return; }
      if (lista) { html += "</ul>"; lista = false; }
      if (t) html += "<p>" + inline(t) + "</p>";
    });
    if (lista) html += "</ul>";
    return html;
  }

  /* ---------------- gaveta de detalhe ---------------- */
  const drawer = $("#drawer"), scrim = $("#scrim");
  let ultimoFoco = null;
  function abrirGaveta(kicker, titulo, corpo) {
    ultimoFoco = document.activeElement;
    $("#drawerKicker").textContent = kicker;
    $("#drawerTitle").textContent = titulo;
    $("#drawerBody").innerHTML = corpo;
    drawer.hidden = false; scrim.hidden = false;
    $("#drawerClose").focus();
  }
  function fecharGaveta() { drawer.hidden = true; scrim.hidden = true; if (ultimoFoco) ultimoFoco.focus(); }
  $("#drawerClose").addEventListener("click", fecharGaveta);
  scrim.addEventListener("click", fecharGaveta);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) fecharGaveta(); });

  function abrirCard(key) {
    const c = cards.find((x) => x.key === key); if (!c) return;
    const [cls, rot] = estado(c);
    abrirGaveta(`${c.key} · ${FRENTES[c.frente] ? FRENTES[c.frente].nome : c.frente}`, c.titulo, `
      <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill ${cls}">${rot}</span>${prazoPill(c)}${c.prioridade ? '<span class="pill ip">Prioridade alta</span>' : ""}${c.heranca ? '<span class="pill ghost">Herdada</span>' : ""}</div>
      <dl class="kv"><dt>Prazo</dt><dd>${c.due ? parseDia(c.due).toLocaleDateString("pt-BR") : "Sem prazo"}</dd>
      <dt>Responsável</dt><dd>${c.resp.map((r) => RESP[r] || r).join(", ") || "A definir"}</dd>
      <dt>Status no Jira</dt><dd>${esc(c.status)}</dd></dl>
      <div class="md">${md(c.description)}</div>
      <div><a class="btn" href="${esc(JIRA.base + c.key)}" target="_blank" rel="noopener">Abrir ${esc(c.key)} no Jira</a></div>`);
  }
  document.addEventListener("click", (e) => {
    const k = e.target.closest("[data-card]"); if (k) { abrirCard(k.dataset.card); return; }
    const p = e.target.closest("[data-parceiro]"); if (p) { abrirParceiro(p.dataset.parceiro); }
  });

  /* ---------------- rede: monta nós a partir de parceiros + laboratórios ---------------- */
  const V = window.VOCAB;
  const AREA_KW = {
    saude: ["saude", "hospital", "clinic", "farmac", "medic", "biotec", "genom", "cancer", "oncolog", "diagnost", "sus ", "vacina", "polilaminina", "neuro", "terapia", "doenca"],
    mineracao: ["miner", "material", "metal", "aco", "siderur", "ciment", "ceram", "nano", "magnet", "scheelita", "tungst", "rocha", "geolog", "metalurg"],
    energia: ["energia", "petrol", "oleo", "gas", "hidrogenio", "eolic", "solar", "renovav", "bateria", "eletric", "offshore", "combustiv", "poco", "pocos"],
    digital: ["inteligencia artificial", " ia ", "dados", "digital", "software", "computa", "algoritm", "automac", "telecom", "nuvem", "alto desempenho", "machine learning", "sistema"],
    agro: ["agro", "aliment", "semente", "abelha", " mel", "coco", "pesca", "bioeconomia", "agricol", "pecuar", "fruta"],
    ambiente: ["ambient", "biodivers", "fauna", "conserva", "clima", "carbono", "restaura", "icmbio", "sustentab", "caatinga", "ecolog"],
    industria: ["industri", "manufatura", "processo produtivo", "produtiv", "textil", "engenharia", "fabrica", "chao de fabrica"],
    cidades: ["prefeitura", "municip", "governo", "publico", "urban", "cidade", "mobilidade", "gestao publica", "smart"],
    quimica: ["quimic", "farmac", "cosmet", "formulac", "aditivo", "molecul"]
  };
  const INT_KW = {
    pdi: ["pesquisa", "desenvolvimento", "p&d", "pd&i", "inovacao", "prototip", "pd ", "tecnolog"],
    editais: ["edital", "chamada", "subvencao", "proposta", "finep", "bndes", "embrapii", "fapern", "cnpq"],
    investimento: ["investiment", "venture", "startup", "aporte", "fundo", "spin", "deep tech", "deeptech", "capital"],
    licenciamento: ["licenc", "patente", "propriedade intelectual", "transferencia de tecnologia"],
    servicos: ["servico", "ensaio", "analise", "certific", "consultoria", "laudo", "diagnost"],
    infraestrutura: ["laboratorio", "infraestrutura", "planta piloto", "equipamento", "multiusuario"],
    formacao: ["capacita", "formacao", "treinamento", "curso"],
    articulacao: ["rede", "articulac", "cooperac", "consorcio"]
  };
  const FIN_KW = {
    FINEP: ["finep", "mais inovacao", "subvencao", "tecnova"], BNDES: ["bndes", "garagem"], EMBRAPII: ["embrapii"],
    Sebrae: ["sebrae"], FAPERN: ["fapern"], CNPq: ["cnpq"], ANP: ["anp", "petrol", "oleo e gas", "poco"],
    ANEEL: ["aneel", "setor eletrico"], MS: ["ministerio da saude", "pronon", " sus", "ms "], "Lei de Informática": ["lei de informatica"]
  };
  const achar = (texto, dic) => Object.keys(dic).filter((k) => dic[k].some((w) => texto.includes(w)));

  const LABS_RAW = (window.__FUNPEC_LABS_DATA__ && window.__FUNPEC_LABS_DATA__.labs) || [];
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const labs = LABS_RAW.map((l) => {
    const blob = " " + norm([l.nome, l.area, l.dominio, l.diferenciais, l.infra].join(" ")) + " ";
    const areas = achar(blob, AREA_KW);
    const comerc = norm(l.comercializa).startsWith("sim");
    const ints = ["pdi", "editais"];
    if (comerc) ints.push("servicos");
    if (l.infra) ints.push("infraestrutura");
    if (l.potencial === "ALTO") ints.push("licenciamento", "investimento");
    const ed = []; const cert = norm(l.certificacao);
    if (cert.includes("finep")) ed.push("FINEP"); if (cert.includes("anp")) ed.push("ANP"); if (areas.includes("saude")) ed.push("MS");
    const isLabcim = blob.includes("labcim");
    return {
      id: "lab:" + slug(l.nome), nome: l.nome.replace(/\s*\((?:não|nao) respondeu[^)]*\)/i, "").replace(/\s*\(NTCPP, não respondeu[^)]*\)/i, ""),
      tipo: "lab", maturidade: isLabcim ? 3 : 0, uf: "RN", areas, interesses: ints, papeis: ["executor", "infraestrutura"], editais: ed,
      potencial: l.potencial, coord: l.coord, cidade: l.cidade, vinculo: l.vinculo, areaTxt: l.area,
      situacao: isLabcim ? "Executor da proposta FINEP Transformação Mineral; em avaliação como Unidade EMBRAPII." : (l.status_2026 || ""),
      proximo: isLabcim ? "Parecer de prontidão EMBRAPII." : (l.potencial === "ALTO" ? "Avaliar inclusão no portfólio para investidores." : "Validar dados com o coordenador."),
      justificativa: l.justificativa, comercializa: l.comercializa, jira: isLabcim ? ["NEIF-364", "NEIF-353"] : [], blob
    };
  });
  const parceiros = (window.PARCEIROS || []).map((p) => Object.assign({}, p, {
    blob: " " + norm([p.nome, p.situacao, p.proximo, (p.areas || []).map((a) => V.areas[a]).join(" ")].join(" ")) + " "
  }));
  const TODOS = parceiros.concat(labs);
  const porId = new Map(TODOS.map((n) => [n.id, n]));
  const resolver = (ref) => {
    if (!ref.startsWith("lab:")) return porId.get(ref);
    const alvo = norm(ref.slice(4));
    return labs.find((l) => norm(l.nome).includes(alvo));
  };

  function abrirParceiro(id) {
    const p = porId.get(id); if (!p) return;
    const lista = (arr, dic) => (arr || []).map((k) => `<span class="tag">${esc(dic[k] || k)}</span>`).join(" ") || '<span class="muted">—</span>';
    const projetos = (window.PROJETOS || []).filter((pr) => pr.membros.some((m) => { const r = resolver(m); return r && r.id === p.id; })).map((pr) => pr.nome);
    abrirGaveta(`${V.tipos[p.tipo] || p.tipo}${p.uf ? " · " + p.uf : ""}`, p.nome, `
      <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill ${p.maturidade >= 3 ? "ip" : p.maturidade === 2 ? "td" : "ghost"}">${esc(V.maturidade[p.maturidade])}</span>${p.potencial ? `<span class="pill ${p.potencial === "ALTO" ? "ok" : "ghost"}">Potencial deep tech ${esc(p.potencial.toLowerCase())}</span>` : ""}</div>
      <dl class="kv">
        <dt>Situação</dt><dd>${esc(p.situacao || "—")}</dd>
        <dt>Próximo passo</dt><dd>${esc(p.proximo || "—")}</dd>
        ${p.coord ? `<dt>Coordenação</dt><dd>${esc(p.coord)}</dd><dt>Vínculo</dt><dd>${esc(p.vinculo || "")} · ${esc(p.cidade || "")}</dd><dt>Atuação</dt><dd>${esc(p.areaTxt || "")}</dd><dt>Comercializa</dt><dd>${esc(p.comercializa || "—")}</dd>` : ""}
        <dt>Áreas</dt><dd>${lista(p.areas, V.areas)}</dd>
        <dt>Interesses</dt><dd>${lista(p.interesses, V.interesses)}</dd>
        <dt>Papel em projetos</dt><dd>${lista(p.papeis, V.papeis)}</dd>
        <dt>Fontes</dt><dd>${(p.editais || []).length ? p.editais.map((e) => `<span class="tag f">${esc(e)}</span>`).join(" ") : '<span class="muted">—</span>'}</dd>
        ${projetos.length ? `<dt>Projetos</dt><dd>${projetos.map(esc).join("<br>")}</dd>` : ""}
      </dl>
      ${p.justificativa ? `<div class="md"><p class="small muted">${esc(p.justificativa)}</p></div>` : ""}
      ${(p.jira || []).length ? `<div><div class="eyebrow" style="margin-bottom:8px">Cards relacionados</div><div class="panel rows">${p.jira.map((k) => { const c = cards.find((x) => x.key === k); return c ? linhaCard(c) : ""; }).join("")}</div></div>` : ""}`);
  }

  /* ---------------- faixa executiva ---------------- */
  const ativos = cards.filter((c) => !c.feito);
  const externos = parceiros.filter((p) => p.id !== "ufrn");
  const figs = [
    { v: "4", k: "propostas FINEP submetidas em 2026" },
    { v: "30", s: "+ mi", k: "R$ em propostas em carteira" },
    { v: String(parceiros.filter((p) => p.tipo === "empresa").length), k: "empresas na carteira de relacionamento" },
    { v: String(externos.length), k: "instituições e fundos na rede" },
    { v: String(labs.length), k: "laboratórios UFRN mapeados" },
    { v: String(ativos.length), k: `atividades ativas · ${cards.filter((c) => c.cat === "indeterminate").length} em andamento` }
  ];
  $("#figures").innerHTML = figs.map((f) => `<div class="figure"><div class="v">${f.v}${f.s ? `<small>${f.s}</small>` : ""}</div><div class="k">${f.k}</div></div>`).join("");
  const mes = HOJE.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  $("#bandEyebrow").textContent = "Diretoria de Inovação e Novos Negócios · " + mes.charAt(0).toUpperCase() + mes.slice(1);

  (function faixaAnimada() {
    const cv = $("#bandNet"); const ctx = cv.getContext && cv.getContext("2d"); if (!ctx) return;
    let W, H, pts = [];
    function tam() {
      const r = cv.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, W / 18));
      pts = Array.from({ length: n }, (_, i) => ({ x: W * (0.45 + 0.55 * Math.random()), y: H * Math.random(), vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, hot: i % 9 === 0 }));
    }
    function quadro() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 120) { ctx.strokeStyle = `rgba(169,177,192,${0.22 * (1 - d / 120)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      pts.forEach((p) => { ctx.fillStyle = p.hot ? "rgba(232,116,63,.9)" : "rgba(200,206,216,.55)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.hot ? 2.6 : 1.6, 0, Math.PI * 2); ctx.fill(); });
    }
    function passo() {
      pts.forEach((p) => { p.x += p.vx; p.y += p.vy; if (p.x < W * 0.4 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
      quadro(); requestAnimationFrame(passo);
    }
    tam(); window.addEventListener("resize", tam);
    if (REDUZIR) quadro(); else requestAnimationFrame(passo);
  })();

  /* ---------------- visão geral ---------------- */
  function linhaCard(c) {
    return `<button type="button" class="row" data-card="${esc(c.key)}"><span class="when">${esc(c.key)}<br>${c.due ? fmtDia(c.due) : "—"}</span><span class="what"><b>${esc(c.titulo)}</b><span>${esc(FRENTES[c.frente] ? FRENTES[c.frente].nome : "")} · ${esc(c.resp.map((r) => RESP[r]).join(", ") || "sem responsável")}</span></span>${c.atrasado ? prazoPill(c) : `<span class="pill ${estado(c)[0]}">${estado(c)[1]}</span>`}</button>`;
  }
  function renderVisao() {
    $("#frentesGrid").innerHTML = Object.keys(FRENTES).map((f) => {
      const cs = cards.filter((c) => c.frente === f);
      const n = { ok: 0, ip: 0, td: 0, late: 0 }; cs.forEach((c) => n[estado(c)[0]]++);
      const tot = cs.length || 1;
      const prox = cs.filter((c) => !c.feito && c.due).sort((a, b) => a.d - b.d)[0];
      return `<button type="button" class="frente" data-frente="${f}">
        <div class="top"><h3>${esc(FRENTES[f].nome)}</h3><span class="count">${cs.length}</span></div>
        <div class="desc">${esc(FRENTES[f].desc)}</div>
        <div class="stackbar" aria-label="${n.ip} em andamento, ${n.td} a iniciar, ${n.late} vencidas, ${n.ok} concluídas">
          <i style="width:${n.ip / tot * 100}%;background:var(--accent)"></i><i style="width:${n.td / tot * 100}%;background:var(--slate)"></i><i style="width:${n.late / tot * 100}%;background:var(--crit)"></i><i style="width:${n.ok / tot * 100}%;background:var(--ok)"></i>
        </div>
        <div class="next">${prox ? `Próximo prazo: <b>${fmtDia(prox.due)}</b> · ${esc(prox.titulo.slice(0, 60))}${prox.titulo.length > 60 ? "…" : ""}` : "Sem prazos em aberto"}</div>
      </button>`;
    }).join("");
    const agenda = ativos.filter((c) => c.d != null && c.d >= 0 && c.d <= 21).sort((a, b) => a.d - b.d);
    $("#agenda").innerHTML = agenda.length ? agenda.map(linhaCard).join("") : '<div class="empty">Nenhum prazo nos próximos 21 dias.</div>';
    const atn = ativos.filter((c) => c.atrasado || c.prioridade || c.heranca).sort((a, b) => (b.atrasado - a.atrasado) || (b.prioridade - a.prioridade) || ((a.d ?? 999) - (b.d ?? 999))).slice(0, 9);
    $("#atencao").innerHTML = atn.length ? atn.map(linhaCard).join("") : '<div class="empty">Nada pendente de atenção.</div>';
  }
  $("#frentesGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-frente]"); if (!b) return;
    $("#fFrente").value = b.dataset.frente; renderAtividades(); location.hash = "atividades";
  });

  /* ---------------- atividades ---------------- */
  $("#fFrente").innerHTML = '<option value="">Todas as frentes</option>' + Object.keys(FRENTES).map((f) => `<option value="${f}">${esc(FRENTES[f].nome)}</option>`).join("");
  $("#fResp").innerHTML = '<option value="">Todos os responsáveis</option>' + Object.keys(RESP).map((r) => `<option value="${r}">${RESP[r]}</option>`).join("");
  let modo = store.get("din-modo", "quadro");
  function setModo(m) { modo = m; store.set("din-modo", m); $("#modoQuadro").setAttribute("aria-pressed", m === "quadro"); $("#modoLista").setAttribute("aria-pressed", m === "lista"); renderAtividades(); }
  $("#modoQuadro").addEventListener("click", () => setModo("quadro"));
  $("#modoLista").addEventListener("click", () => setModo("lista"));
  ["fBusca", "fFrente", "fResp", "fPrazo"].forEach((id) => $("#" + id).addEventListener("input", renderAtividades));
  function filtrados() {
    const q = norm($("#fBusca").value), f = $("#fFrente").value, r = $("#fResp").value, p = $("#fPrazo").value;
    return cards.filter((c) => (!f || c.frente === f) && (!r || c.resp.includes(r)) &&
      (!q || norm(c.key + " " + c.summary + " " + c.description).includes(q)) &&
      (!p || (p === "late" ? c.atrasado : (!c.feito && c.d != null && c.d >= 0 && c.d <= +p))))
      .sort((a, b) => (a.d ?? 9999) - (b.d ?? 9999));
  }
  function cartao(c) {
    return `<button type="button" class="card" data-card="${esc(c.key)}">
      <div class="meta"><span class="mono">${esc(c.key)}</span>${prazoPill(c) || `<span class="pill ghost">${c.due ? fmtDia(c.due) : "sem prazo"}</span>`}</div>
      <div class="t">${esc(c.titulo)}</div>
      <div class="tags"><span class="tag f">${esc(FRENTES[c.frente] ? FRENTES[c.frente].nome : c.frente)}</span>${c.resp.map((r) => `<span class="tag">${esc(RESP[r] || r)}</span>`).join("")}</div>
    </button>`;
  }
  function renderAtividades() {
    const cs = filtrados();
    $("#modoQuadro").setAttribute("aria-pressed", modo === "quadro"); $("#modoLista").setAttribute("aria-pressed", modo === "lista");
    if (!cs.length) { $("#ativOut").innerHTML = '<div class="panel empty">Nenhuma atividade com esses filtros.</div>'; return; }
    if (modo === "quadro") {
      const cols = [["td", "A iniciar", (c) => !c.feito && c.cat !== "indeterminate"], ["ip", "Em andamento", (c) => !c.feito && c.cat === "indeterminate"], ["ok", "Concluído", (c) => c.feito]];
      $("#ativOut").innerHTML = `<div class="board">${cols.map(([k, nome, fn]) => { const l = cs.filter(fn); return `<div class="col"><h3><span>${nome}</span><span class="mono">${l.length}</span></h3>${l.map(cartao).join("") || '<div class="empty small">Nada aqui.</div>'}</div>`; }).join("")}</div>`;
    } else {
      $("#ativOut").innerHTML = `<div class="panel scroll-x"><table class="data"><thead><tr><th>Código</th><th>Atividade</th><th>Frente</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead><tbody>${cs.map((c) => `<tr class="click" data-card="${esc(c.key)}"><td class="mono">${esc(c.key)}</td><td style="min-width:260px"><b>${esc(c.titulo)}</b></td><td>${esc(FRENTES[c.frente] ? FRENTES[c.frente].nome : "")}</td><td>${esc(c.resp.map((r) => RESP[r]).join(", "))}</td><td class="mono" style="white-space:nowrap">${c.due ? fmtDia(c.due) : "—"}</td><td>${c.atrasado ? prazoPill(c) : `<span class="pill ${estado(c)[0]}">${estado(c)[1]}</span>`}</td></tr>`).join("")}</tbody></table></div>`;
    }
  }
  const gerado = JIRA.geradoEm ? new Date(JIRA.geradoEm) : null;
  $("#jiraFonte").textContent = `${cards.length} cards com a etiqueta plano-nov2026${gerado ? " · atualizado em " + gerado.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}.`;
  $("#footData").textContent = gerado ? "Dados do Jira de " + gerado.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

  /* ---------------- rede: filtros ---------------- */
  const filtro = store.get("din-rede-filtro", { mat: [], tipo: [], area: [], int: [], lab: "todos" });
  let destaque = null; // Map id -> rank do matching
  function chips(el, dic, chave) {
    el.innerHTML = Object.keys(dic).map((k) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${filtro[chave].includes(isNaN(+k) ? k : +k)}">${esc(dic[k])}</button>`).join("");
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const k = isNaN(+b.dataset.k) ? b.dataset.k : +b.dataset.k;
      const i = filtro[chave].indexOf(k); if (i >= 0) filtro[chave].splice(i, 1); else filtro[chave].push(k);
      b.setAttribute("aria-pressed", i < 0); store.set("din-rede-filtro", filtro); aplicarFiltro();
    });
  }
  const MAT_CHIPS = { 4: "Contratado", 3: "Em execução", 2: "Ativo", 1: "Em aproximação", 0: "Mapeado" };
  chips($("#cMat"), MAT_CHIPS, "mat");
  chips($("#cTipo"), V.tipos, "tipo");
  chips($("#cArea"), V.areas, "area");
  chips($("#cInt"), V.interesses, "int");
  const LAB_OPTS = { todos: "Todos", alto: "Só potencial alto", ocultar: "Ocultar" };
  $("#cLab").innerHTML = Object.keys(LAB_OPTS).map((k) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${filtro.lab === k}">${LAB_OPTS[k]}</button>`).join("");
  $("#cLab").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return; filtro.lab = b.dataset.k;
    $("#cLab").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b)); store.set("din-rede-filtro", filtro); aplicarFiltro();
  });
  $("#limparFiltros").addEventListener("click", () => {
    filtro.mat = []; filtro.tipo = []; filtro.area = []; filtro.int = []; filtro.lab = "todos"; destaque = null;
    document.querySelectorAll("#v-rede .filters .chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.k === "todos"));
    store.set("din-rede-filtro", filtro); aplicarFiltro();
  });
  const passa = (n) => {
    if (n.id === "funpec") return true;
    if (n.tipo === "lab" && (filtro.lab === "ocultar" || (filtro.lab === "alto" && n.potencial !== "ALTO"))) return false;
    if (filtro.mat.length && !filtro.mat.includes(n.maturidade)) return false;
    if (filtro.tipo.length && !filtro.tipo.includes(n.tipo)) return false;
    if (filtro.area.length && !(n.areas || []).some((a) => filtro.area.includes(a))) return false;
    if (filtro.int.length && !(n.interesses || []).some((a) => filtro.int.includes(a))) return false;
    return true;
  };

  /* ---------------- rede: grafo (d3-force) ---------------- */
  let rede = null;
  const COR = { 4: "#F09A6E", 3: "#DB632E", 2: "#8E9AB0", 1: "#1F222B", 0: "#4A5060" };
  function iniciarRede() {
    if (rede || !window.d3) { if (!window.d3) $("#netCount").textContent = "Biblioteca de gráficos indisponível."; return; }
    const svg = d3.select("#net");
    const box = svg.node().getBoundingClientRect(); const W = box.width, H = box.height;
    svg.attr("viewBox", [0, 0, W, H]);
    const nodes = [{ id: "funpec", nome: "FUNPEC", tipo: "core", maturidade: 5 }].concat(TODOS.map((n) => Object.assign({}, n)));
    const nmap = new Map(nodes.map((n) => [n.id, n]));
    const links = [];
    const add = (a, b, tipo, nome) => { if (a && b && a !== b) links.push({ source: a, target: b, tipo, nome }); };
    parceiros.forEach((p) => add("funpec", p.id, "core"));
    labs.forEach((l) => add("ufrn", l.id, "lab"));
    (window.PROJETOS || []).forEach((pr) => {
      const ids = pr.membros.map(resolver).filter(Boolean).map((n) => n.id);
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) add(ids[i], ids[j], "proj", pr.nome);
    });
    const raio = (n) => n.id === "funpec" ? 26 : n.id === "ufrn" ? 14 : n.tipo === "lab" ? (n.maturidade ? 8 : n.potencial === "ALTO" ? 5.5 : 4) : 5 + n.maturidade * 2.2;
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance((l) => l.tipo === "core" ? 250 - (l.target.maturidade || 0) * 30 : l.tipo === "lab" ? 55 : 90).strength((l) => l.tipo === "proj" ? 0.35 : l.tipo === "lab" ? 0.5 : 0.25))
      .force("charge", d3.forceManyBody().strength((d) => d.tipo === "lab" ? -40 : -380))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide().radius((d) => raio(d) + 3))
      .force("x", d3.forceX(W / 2).strength(0.02)).force("y", d3.forceY(H / 2).strength(0.05));
    const gLinks = svg.append("g");
    const link = gLinks.selectAll("line").data(links).join("line")
      .attr("stroke", (d) => d.tipo === "proj" ? "#DB632E" : "#8E9AB0")
      .attr("stroke-opacity", (d) => d.tipo === "proj" ? 0.55 : d.tipo === "lab" ? 0.16 : 0.22)
      .attr("stroke-width", (d) => d.tipo === "proj" ? 1.6 : 1);
    const pulsos = svg.append("g");
    const node = svg.append("g").selectAll("g").data(nodes).join("g").attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", (d) => d.nome).style("cursor", "pointer");
    node.append("circle").attr("class", "halo").attr("r", (d) => raio(d) + 6).attr("fill", "none").attr("stroke", "#F09A6E").attr("stroke-width", 2).attr("opacity", 0);
    node.append("circle").attr("r", raio)
      .attr("fill", (d) => d.id === "funpec" ? "#F2F3F5" : COR[d.maturidade] || COR[0])
      .attr("stroke", (d) => d.id === "funpec" ? "#DB632E" : d.maturidade === 1 ? "#8E9AB0" : d.tipo === "lab" && d.potencial === "ALTO" ? "#F09A6E" : "none")
      .attr("stroke-dasharray", (d) => d.maturidade === 1 ? "3 2" : null)
      .attr("stroke-width", (d) => d.id === "funpec" ? 3 : 1.5);
    node.filter((d) => d.id === "funpec").append("text").text("FUNPEC").attr("text-anchor", "middle").attr("dy", "0.35em")
      .attr("font-family", "Poppins, sans-serif").attr("font-weight", 700).attr("font-size", 10.5).attr("fill", "#1F222B").style("pointer-events", "none");
    const rotulo = node.filter((d) => d.id !== "funpec").append("text").attr("class", "node-label").attr("x", (d) => raio(d) + 5).attr("dy", "0.35em")
      .text((d) => d.nome.length > 34 ? d.nome.slice(0, 32) + "…" : d.nome);
    node.on("click", (e, d) => { if (d.id !== "funpec") abrirParceiro(d.id); })
      .on("keydown", (e, d) => { if ((e.key === "Enter" || e.key === " ") && d.id !== "funpec") { e.preventDefault(); abrirParceiro(d.id); } })
      .on("mouseenter", function (e, d) { d3.select(this).select(".node-label").attr("opacity", 1); link.attr("stroke-opacity", (l) => (l.source === d || l.target === d) ? 0.9 : null); })
      .on("mouseleave", function () { aplicarFiltro(); });
    node.call(d3.drag()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); if (d.id !== "funpec") { d.fx = null; d.fy = null; } }));
    const fun = nmap.get("funpec"); fun.fx = W / 2; fun.fy = H / 2;
    sim.on("tick", () => {
      nodes.forEach((d) => { const r = raio(d) + 2; d.x = Math.max(r, Math.min(W - r - 4, d.x)); d.y = Math.max(r + 24, Math.min(H - r - 30, d.y)); });
      link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y).attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
    // pulsos de "sinapse" ao longo das ligações de projeto
    const projLinks = links.filter((l) => l.tipo === "proj" || (l.tipo === "core" && (l.target.maturidade || 0) >= 3));
    const ps = projLinks.map((l, i) => ({ l, t: (i * 0.137) % 1, v: 0.0025 + (i % 5) * 0.0007 }));
    const dots = pulsos.selectAll("circle").data(ps).join("circle").attr("r", 2).attr("fill", "#F09A6E").attr("opacity", 0.9).style("pointer-events", "none");
    if (!REDUZIR) d3.timer(() => {
      ps.forEach((p) => { p.t = (p.t + p.v) % 1; });
      dots.attr("cx", (p) => p.l.source.x + (p.l.target.x - p.l.source.x) * p.t).attr("cy", (p) => p.l.source.y + (p.l.target.y - p.l.source.y) * p.t)
        .attr("display", (p) => p.l._vis ? null : "none");
    });
    rede = { node, link, rotulo, nodes, links, dots };
    aplicarFiltro();
  }
  function aplicarFiltro() {
    if (!rede) return;
    const vis = new Map(rede.nodes.map((n) => [n.id, passa(n)]));
    if (filtro.lab !== "ocultar") vis.set("ufrn", vis.get("ufrn") || labs.some((l) => passa(l)));
    const hl = destaque;
    rede.node.attr("display", (d) => d.tipo === "lab" && filtro.lab === "ocultar" ? "none" : null)
      .attr("opacity", (d) => !vis.get(d.id) ? 0.1 : hl && d.id !== "funpec" && !hl.has(d.id) ? 0.18 : 1);
    rede.node.select(".halo").attr("opacity", (d) => hl && hl.has(d.id) ? 0.95 : 0);
    rede.rotulo.attr("opacity", (d) => {
      if (!vis.get(d.id)) return 0;
      if (hl) return hl.has(d.id) ? 1 : 0;
      return d.tipo === "lab" ? (d.maturidade ? 1 : 0) : d.maturidade >= 2 || d.id === "ufrn" ? 1 : 0.55;
    });
    rede.link.attr("display", (l) => (l.source.tipo === "lab" || l.target.tipo === "lab") && filtro.lab === "ocultar" ? "none" : null)
      .attr("stroke-opacity", (l) => {
        const ok = vis.get(l.source.id) && vis.get(l.target.id);
        l._vis = ok && (!hl || (hl.has(l.target.id) || hl.has(l.source.id)));
        if (!ok) return 0.03;
        if (hl) return (hl.has(l.source.id) || l.source.id === "funpec") && hl.has(l.target.id) ? 0.85 : 0.04;
        return l.tipo === "proj" ? 0.55 : l.tipo === "lab" ? 0.16 : 0.22;
      });
    const n = rede.nodes.filter((d) => d.id !== "funpec" && vis.get(d.id) && !(d.tipo === "lab" && filtro.lab === "ocultar")).length;
    $("#netCount").textContent = `${n} de ${rede.nodes.length - 1} na rede${hl ? " · " + hl.size + " indicados" : ""}`;
  }

  /* ---------------- matching ---------------- */
  const EXEMPLOS = [
    { t: "Chamada FINEP de subvenção para beneficiamento de scheelita e tungstênio, com empresa coparticipante e ICT executora.", e: 1, i: 1 },
    { t: "Edital do Ministério da Saúde para diagnóstico e tratamento oncológico, com hospital parceiro e laboratório de genômica.", i: 1 },
    { t: "Projeto de P&D ANP para recuperação de poços maduros de petróleo em Mossoró.", e: 1 },
    { t: "Fundo de investimento procurando deep techs de materiais avançados e nanotecnologia para aporte.", v: 1 },
    { t: "Prefeitura quer solução de inteligência artificial e dados para gestão urbana e licenciamento ambiental." }
  ];
  $("#mExemplos").innerHTML = EXEMPLOS.map((x, i) => `<button type="button" data-ex="${i}">${esc(x.t)}</button>`).join("");
  $("#mExemplos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ex]"); if (!b) return; const x = EXEMPLOS[+b.dataset.ex];
    $("#mTexto").value = x.t; $("#mEmpresa").checked = !!x.e; $("#mIct").checked = !!x.i; $("#mInvest").checked = !!x.v; executarMatching();
  });
  $("#matchForm").addEventListener("submit", (e) => { e.preventDefault(); executarMatching(); });
  $("#mLimpar").addEventListener("click", () => { $("#mTexto").value = ""; ["mEmpresa", "mIct", "mInvest"].forEach((id) => { $("#" + id).checked = false; }); destaque = null; renderMatchVazio(); aplicarFiltro(); });
  const STOP = new Set("para com sem uma umas uns dos das nos nas pelo pela pelos pelas como mais que entre sobre quer projeto edital chamada parceiro parceiros empresa empresas apoio area areas".split(" "));
  function renderMatchVazio() {
    $("#matchOut").innerHTML = `<div class="empty" style="text-align:left;padding:8px 0"><div class="eyebrow" style="margin-bottom:8px">Como funciona</div>
      <p style="margin:0 0 10px">O texto é lido para identificar área, interesse e financiador. Cada parceiro recebe uma nota pela aderência de área (peso maior), interesse, experiência com o financiador citado, maturidade da relação com a FUNPEC e, nos laboratórios, potencial deep tech.</p>
      <p style="margin:0">O resultado sai agrupado pelo papel no projeto (executor, empresa, financiador ou investidor e apoio) e destaca os indicados na rede acima.</p></div>`;
  }
  function executarMatching() {
    const bruto = $("#mTexto").value.trim();
    if (!bruto) { $("#matchOut").innerHTML = '<div class="empty">Descreva o projeto ou edital, ou escolha um exemplo.</div>'; return; }
    const t = " " + norm(bruto) + " ";
    const areasQ = achar(t, AREA_KW), intsQ = achar(t, INT_KW), finQ = achar(t, FIN_KW);
    const tokens = Array.from(new Set(t.split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !STOP.has(w))));
    const querEmp = $("#mEmpresa").checked, querIct = $("#mIct").checked, querInv = $("#mInvest").checked;
    const res = [];
    TODOS.forEach((n) => {
      let s = 0; const why = [];
      const a = (n.areas || []).filter((x) => areasQ.includes(x));
      if (a.length) { s += 3 * a.length; why.push("área: " + a.map((x) => V.areas[x].toLowerCase()).join(", ")); }
      const i = (n.interesses || []).filter((x) => intsQ.includes(x));
      if (i.length) { s += 1.2 * i.length; why.push("interesse em " + i.map((x) => V.interesses[x].toLowerCase()).join(", ")); }
      const f = (n.editais || []).filter((x) => finQ.includes(x));
      if (f.length) { s += 2 * f.length; why.push("opera com " + f.join(", ")); }
      const hits = tokens.filter((w) => n.blob.includes(w)).slice(0, 4);
      if (hits.length) { s += 0.9 * hits.length; why.push("cita " + hits.join(", ")); }
      if (s === 0) return;
      if (areasQ.length && !a.length) s *= 0.35;
      if (n.tipo === "fomento" && !f.length && !querInv) s *= 0.4;
      if (n.maturidade) { s += n.maturidade * 0.5; if (n.maturidade >= 3) why.push("relação " + V.maturidade[n.maturidade].toLowerCase()); }
      if (n.potencial === "ALTO") { s += 1; why.push("potencial deep tech alto"); } else if (n.potencial === "MEDIO") s += 0.4;
      const pap = n.papeis || [];
      if (querEmp && pap.includes("empresa")) s += 2.5;
      if (querIct && pap.includes("executor")) s += 2;
      if (querInv && (pap.includes("investidor") || pap.includes("financiador"))) s += 2.5;
      res.push({ n, s, why });
    });
    if (!res.length) {
      destaque = null; aplicarFiltro();
      $("#matchOut").innerHTML = '<div class="empty">Nenhum parceiro aderente. Cite a área (mineração, saúde, energia…), o financiador (FINEP, BNDES, EMBRAPII…) ou o tipo de parceiro que procura.</div>';
      return;
    }
    const max = Math.max(...res.map((r) => r.s));
    const grupos = [
      ["Executores técnicos", (n) => ["ict", "centro", "lab"].includes(n.tipo)],
      ["Empresas coparticipantes", (n) => n.tipo === "empresa"],
      ["Financiadores e investidores", (n) => ["fundo", "fomento"].includes(n.tipo)],
      ["Apoio institucional", (n) => ["governo", "ecossistema", "fundacao"].includes(n.tipo)]
    ];
    const top = {};
    grupos.forEach(([nome, fn]) => { top[nome] = res.filter((r) => fn(r.n)).sort((x, y) => y.s - x.s).slice(0, 5); });
    const ordem = grupos.map((g) => g[0]).sort((x, y) => {
      const pri = (g) => (g === "Empresas coparticipantes" && querEmp) || (g === "Executores técnicos" && querIct) || (g === "Financiadores e investidores" && querInv) ? 1 : 0;
      return pri(y) - pri(x);
    });
    destaque = new Set(); Object.values(top).forEach((l) => l.forEach((r) => destaque.add(r.n.id)));
    const consorcio = ["Executores técnicos", "Empresas coparticipantes", "Financiadores e investidores"].map((g) => top[g][0]).filter(Boolean);
    const leitura = [areasQ.map((a) => V.areas[a]).join(", "), finQ.join(", ")].filter(Boolean).join(" · ") || "termos livres";
    $("#matchOut").innerHTML = `
      <div class="eyebrow">Leitura do pedido</div><p style="margin:6px 0 16px">${esc(leitura)}</p>
      ${consorcio.length > 1 ? `<div class="panel" style="padding:14px 16px;margin-bottom:18px;background:var(--accent-soft);border-color:transparent"><div class="small" style="color:var(--accent-ink);font-weight:600;margin-bottom:4px">Arranjo sugerido</div><div>${consorcio.map((r) => `<a href="#" data-parceiro="${esc(r.n.id)}" style="font-weight:600">${esc(r.n.nome)}</a>`).join(" + ")}</div></div>` : ""}
      ${ordem.filter((g) => top[g].length).map((g) => `<div class="result-group"><h4>${g}</h4>${top[g].map((r) => `
        <div class="result"><b><a href="#" data-parceiro="${esc(r.n.id)}">${esc(r.n.nome)}</a> <span class="small muted">· ${esc(V.tipos[r.n.tipo])} · ${esc(V.maturidade[r.n.maturidade])}</span></b>
        <span class="score"><i style="width:${Math.round(r.s / max * 60)}px"></i>${Math.round(r.s / max * 100)}</span>
        <span class="why">${esc(r.why.join(" · "))}</span></div>`).join("")}</div>`).join("")}`;
    aplicarFiltro();
  }
  $("#matchOut").addEventListener("click", (e) => { if (e.target.closest("[data-parceiro]")) e.preventDefault(); });
  renderMatchVazio();

  /* ---------------- pipeline ---------------- */
  const tiposPipe = Array.from(new Set(parceiros.map((p) => p.tipo)));
  $("#pTipo").innerHTML = '<option value="">Todos os tipos</option>' + tiposPipe.map((t) => `<option value="${t}">${esc(V.tipos[t])}</option>`).join("");
  $("#pTipo").addEventListener("input", renderPipeline);
  function renderPipeline() {
    const t = $("#pTipo").value;
    const est = [[1, "Em aproximação"], [2, "Relacionamento ativo"], [3, "Em execução"], [4, "Projeto contratado"]];
    const base = parceiros.concat(labs.filter((l) => l.maturidade > 0)).filter((p) => !t || p.tipo === t);
    $("#pipeOut").innerHTML = est.map(([m, nome]) => {
      const l = base.filter((p) => p.maturidade === m);
      return `<div><div class="stage-head" style="border-bottom-color:${m >= 3 ? "var(--accent)" : m === 2 ? "var(--slate)" : "var(--line)"}"><h3>${nome}</h3><span class="n">${l.length}</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">${l.map((p) => `<button type="button" class="card" data-parceiro="${esc(p.id)}">
        <div class="meta"><span>${esc(V.tipos[p.tipo])}${p.uf ? " · " + esc(p.uf) : ""}</span>${(p.jira || []).length ? `<span class="mono">${esc(p.jira[0])}</span>` : ""}</div>
        <div class="t">${esc(p.nome)}</div>
        <div class="small muted">${esc(p.situacao)}</div>
        <div class="small"><b>Próximo:</b> ${esc(p.proximo)}</div></button>`).join("") || '<div class="empty small">Nenhum parceiro neste estágio.</div>'}</div></div>`;
    }).join("");
  }

  /* ---------------- indicadores ---------------- */
  const IND = (window.INDICADORES || []).map((r, i) => ({ id: "i" + i, eixo: r[0], ind: r[1], unid: r[2], freq: r[3], dez: r[4], jun: r[5], tipo: r[6] }));
  let real = store.get("din-ind-real", {});
  function numBR(s) { if (s == null) return null; let t = String(s).trim().replace(/R\$|\s|%/g, ""); if (!t) return null; if (t.includes(",")) t = t.replace(/\./g, "").replace(",", "."); const n = parseFloat(t); return isNaN(n) ? null : n; }
  function renderIndicadores() {
    $("#indOut").innerHTML = Object.keys(window.EIXOS || {}).map((ek) => {
      const lin = IND.filter((d) => d.eixo === ek);
      const pcts = lin.filter((d) => real[d.id] != null).map((d) => Math.min(1.5, real[d.id] / d.jun));
      const media = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length * 100) : null;
      return `<section class="panel eixo"><header><div><div class="eyebrow">${esc(ek)}</div><h3>${esc(window.EIXOS[ek])}</h3></div>
        <div style="text-align:right"><div class="pct">${media == null ? "—" : media + "%"}</div><div class="small muted">${pcts.length} de ${lin.length} lançados · média da meta jun/27</div></div></header>
        <div class="scroll-x"><table class="data"><thead><tr><th>Indicador</th><th>Frequência</th><th class="r">Marco dez/26</th><th class="r">Meta jun/27</th><th class="r">Realizado</th><th>Atingimento</th></tr></thead><tbody>
        ${lin.map((d) => { const v = real[d.id]; const p = v != null ? Math.min(100, v / d.jun * 100) : 0; const marco = d.dez / d.jun * 100;
          return `<tr><td style="min-width:220px"><b>${esc(d.ind)}</b><div class="small muted">${esc(d.unid)}</div></td><td>${esc(d.freq)}</td><td class="r num">${fmtNum(d.dez, d.tipo)}</td><td class="r num">${fmtNum(d.jun, d.tipo)}</td>
          <td class="r"><input class="real" id="real-${d.id}" data-id="${d.id}" inputmode="decimal" aria-label="Realizado de ${esc(d.ind)}" value="${v == null ? "" : String(v).replace(".", ",")}" placeholder="—"></td>
          <td style="min-width:140px"><div class="prog" title="Marco de dez/26 em ${Math.round(marco)}% da meta"><i style="width:${p}%;${v != null && v >= d.dez ? "background:var(--ok)" : ""}"></i><s style="left:${marco}%"></s></div><div class="small muted num" style="margin-top:4px">${v == null ? "sem lançamento" : Math.round(v / d.jun * 100) + "% da meta"}</div></td></tr>`; }).join("")}
        </tbody></table></div></section>`;
    }).join("");
  }
  $("#indOut").addEventListener("change", (e) => {
    const inp = e.target.closest(".real"); if (!inp) return; const v = numBR(inp.value);
    if (v == null) delete real[inp.dataset.id]; else real[inp.dataset.id] = v;
    store.set("din-ind-real", real); renderIndicadores();
  });
  $("#indLimpar").addEventListener("click", () => { real = {}; store.set("din-ind-real", real); renderIndicadores(); });
  (async function lerPlanilha() {
    const url = window.INDICADORES_CSV_URL;
    $("#indFonte").textContent = url ? "Lendo planilha…" : "Lançamento manual";
    if (!url) return;
    try {
      const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now()); if (!r.ok) throw new Error("HTTP " + r.status);
      const linhas = (await r.text()).split(/\r?\n/).map((l) => l.split(","));
      const cab = linhas[0].map(norm); const cE = cab.indexOf("eixo"), cI = cab.findIndex((c) => c.startsWith("indicador")), cR = cab.findIndex((c) => c.startsWith("realizado"));
      let n = 0; linhas.slice(1).forEach((l) => { const d = IND.find((x) => norm(x.eixo) === norm(l[cE]) && norm(x.ind) === norm(l[cI])); const v = numBR(l[cR]); if (d && v != null) { real[d.id] = v; n++; } });
      $("#indFonte").textContent = `Planilha conectada · ${n} indicadores lidos`; renderIndicadores();
    } catch (err) { $("#indFonte").textContent = "Não foi possível ler a planilha (" + err.message + "). Usando lançamentos locais."; }
  })();

  /* ---------------- equipe e rotina ---------------- */
  const FOCO = {
    diretor: ["Raphael Rodrigues", "Parcerias estratégicas, PD&I com empresas, portfólio e investidores, ICT e transformação digital."],
    gerente: ["Gerência executiva", "Demandas institucionais herdadas, programas legados, incorporação da submissão e rotina da área."],
    analista: ["Analista de captação", "Radar de editais, propostas FINEP e BNDES, carteira corporativa e base de ativos da UFRN."]
  };
  function renderEquipe() {
    $("#equipeOut").innerHTML = Object.keys(RESP).map((r) => {
      const l = ativos.filter((c) => c.resp.includes(r)).sort((a, b) => (a.d ?? 999) - (b.d ?? 999));
      const ini = RESP[r].split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      return `<div class="panel person"><div class="role"><span class="avatar">${ini}</span><div><h3>${esc(RESP[r])}</h3><div class="small muted">${esc(FOCO[r][0])}</div></div><span class="pill ghost" style="margin-left:auto">${l.length} cards</span></div>
        <p class="small muted" style="margin:0">${esc(FOCO[r][1])}</p>
        <div class="rows" style="border-top:1px solid var(--line-2);margin:0 -22px -22px">${l.slice(0, 6).map(linhaCard).join("")}${l.length > 6 ? `<div class="small muted" style="padding:10px 18px">+ ${l.length - 6} cards</div>` : ""}</div></div>`;
    }).join("");
    const k = cards.find((c) => c.key === "NEIF-345") || cards.find((c) => /kickoff/i.test(c.summary));
    $("#kickoffOut").innerHTML = k ? md(k.description) : '<p class="muted">Card de kickoff não encontrado no Jira.</p>';
    if (k) $("#kickoffLink").href = JIRA.base + k.key; else $("#kickoffLink").hidden = true;
  }

  /* ---------------- navegação ---------------- */
  const VIEWS = ["visao", "atividades", "rede", "pipeline", "indicadores", "rotina"];
  function rotear() {
    const h = location.hash.replace("#", "");
    const v = VIEWS.includes(h) ? h : "visao";
    VIEWS.forEach((x) => { $("#v-" + x).hidden = x !== v; });
    document.body.classList.toggle("compacto", v !== "visao");
    document.querySelectorAll("nav.tabs a").forEach((a) => { if (a.getAttribute("href") === "#" + v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (v === "rede") requestAnimationFrame(iniciarRede);
    if (VIEWS.includes(h)) { const m = $("main"); if (m && window.scrollY > m.offsetTop) window.scrollTo({ top: m.offsetTop - 70, behavior: REDUZIR ? "auto" : "smooth" }); }
  }
  window.addEventListener("hashchange", rotear);

  renderVisao(); renderAtividades(); renderPipeline(); renderIndicadores(); renderEquipe(); rotear();
})();
