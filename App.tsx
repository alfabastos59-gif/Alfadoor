import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Building2, CheckCircle2,
  ChevronDown, CircleHelp, Clapperboard, CreditCard, LayoutDashboard,
  LogOut, Menu, Monitor, Plus, Search, Settings, ShieldCheck, Tv2, Users,
  Wifi, X, LoaderCircle, Megaphone, RefreshCw
} from "lucide-react";
import { supabase, supabaseConfigured } from "./lib/supabase";

type Advertiser = {
  id: string; company_name: string; contact_name: string | null; email: string | null;
  phone: string | null; status: "active" | "inactive"; created_at: string;
};
type Screen = {
  id: string; name: string; code: string; status: string; venue_name?: string | null;
  last_seen_at?: string | null;
};

const navItems = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "advertisers", label: "Anunciantes", icon: Users },
  { id: "screens", label: "Telas e locais", icon: Monitor },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "media", label: "Biblioteca de mídia", icon: Clapperboard },
  { id: "billing", label: "Financeiro", icon: CreditCard }
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [section, setSection] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAdvertiserForm, setShowAdvertiserForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadData() {
    if (!session) return;
    setLoadingData(true);
    setError("");
    const [a, s] = await Promise.all([
      supabase.from("advertisers").select("id,company_name,contact_name,email,phone,status,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("devices").select("id,name,activation_code,status,last_seen_at,venues(name)").order("created_at", { ascending: false }).limit(500)
    ]);
    if (a.error && !a.error.message.includes("does not exist")) setError(a.error.message);
    if (!a.error) setAdvertisers(a.data as Advertiser[]);
    if (!s.error) setScreens((s.data || []).map((row: any) => ({
      id: row.id, name: row.name, code: row.activation_code, status: row.status,
      last_seen_at: row.last_seen_at, venue_name: row.venues?.name ?? null
    })));
    setLoadingData(false);
  }

  useEffect(() => { if (session) void loadData(); }, [session]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginBusy(true); setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (loginError) setError(loginError.message);
    setLoginBusy(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setAdvertisers([]);
    setScreens([]);
  }

  async function addAdvertiser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true); setError(""); setNotice("");
    const payload = {
      company_name: String(form.get("company_name") || "").trim(),
      contact_name: String(form.get("contact_name") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null
    };
    const { error: insertError } = await supabase.from("advertisers").insert(payload);
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setShowAdvertiserForm(false);
    setNotice("Anunciante cadastrado com sucesso.");
    await loadData();
  }

  const filteredAdvertisers = useMemo(() => advertisers.filter(a =>
    `${a.company_name} ${a.contact_name || ""} ${a.email || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [advertisers, search]);

  if (!authReady) return <div className="loading-screen"><LoaderCircle className="spin" size={28}/><span>Carregando AlfaDoor…</span></div>;

  if (!supabaseConfigured) return <SetupScreen />;

  if (!session) return (
    <div className="login-page">
      <div className="login-art">
        <div className="brand brand-light"><span className="brand-mark"><Tv2 size={23}/></span><span>Alfa<span>Door</span></span></div>
        <div className="login-art-copy">
          <div className="eyebrow"><span className="pulse-dot"/> REDE DE PUBLICIDADE DIGITAL</div>
          <h1>Sua marca.<br/>Em todo lugar.</h1>
          <p>Gerencie telas, campanhas e anunciantes em uma única plataforma.</p>
          <div className="art-screen"><div className="art-screen-top"><span>ALFADOOR NETWORK</span><span>● AO VIVO</span></div><div className="art-screen-content"><div className="art-badge">MÍDIA INDOOR</div><strong>Conecte marcas<br/>a novas oportunidades.</strong><div className="art-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div></div>
        </div>
        <div className="login-footer">ALFADOOR · MÍDIA INDOOR DIGITAL</div>
      </div>
      <div className="login-panel">
        <form className="login-form" onSubmit={handleLogin}>
          <div className="mobile-brand brand"><span className="brand-mark"><Tv2 size={23}/></span><span>Alfa<span>Door</span></span></div>
          <div className="form-kicker">ÁREA RESTRITA</div>
          <h2>Bem-vindo de volta</h2>
          <p className="muted">Entre com sua conta administrativa para continuar.</p>
          {error && <div className="alert error"><CircleHelp size={17}/>{error}</div>}
          <label>E-mail<input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="voce@empresa.com" required autoComplete="username"/></label>
          <label>Senha<input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Sua senha" required autoComplete="current-password"/></label>
          <button className="primary-btn login-btn" disabled={loginBusy}>{loginBusy ? <LoaderCircle className="spin" size={18}/> : null} Entrar na plataforma</button>
          <div className="secure-note"><ShieldCheck size={16}/> Acesso protegido pelo Supabase Auth</div>
        </form>
        <div className="panel-bottom">© {new Date().getFullYear()} AlfaDoor. Todos os direitos reservados.</div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-overlay" aria-label="Fechar menu" onClick={()=>setMobileNav(false)}/>}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand sidebar-brand"><span className="brand-mark"><Tv2 size={23}/></span><span>Alfa<span>Door</span></span></div>
        <div className="workspace"><div className="workspace-icon"><Building2 size={18}/></div><div><strong>Minha rede</strong><small>Plano administrador</small></div><ChevronDown size={15}/></div>
        <div className="nav-label">MENU PRINCIPAL</div>
        <nav>{navItems.map(item => <button key={item.id} className={`nav-item ${section===item.id?"active":""}`} onClick={()=>{setSection(item.id);setMobileNav(false);}}><item.icon size={18}/><span>{item.label}</span>{item.id==="screens" && screens.length>0 ? <b>{screens.length}</b>:null}</button>)}</nav>
        <div className="sidebar-spacer"/>
        <div className="sidebar-help"><div className="help-icon"><CircleHelp size={19}/></div><strong>Precisa de ajuda?</strong><p>Consulte a documentação da sua rede.</p><button onClick={()=>setNotice("A documentação será adicionada nas próximas etapas.")}>Central de ajuda <ArrowUpRight size={14}/></button></div>
        <button className="nav-item settings-link" onClick={()=>setNotice("Configurações serão implementadas na próxima etapa.")}><Settings size={18}/><span>Configurações</span></button>
        <div className="user-profile"><div className="avatar">{(session.user.email||"A").slice(0,1).toUpperCase()}</div><div className="user-details"><strong>Administrador</strong><small>{session.user.email}</small></div><button className="icon-btn" title="Sair" onClick={handleLogout}><LogOut size={17}/></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Abrir menu"><Menu size={21}/></button>
          <div className="breadcrumbs"><span>AlfaDoor</span><span className="crumb-sep">/</span><strong>{navItems.find(i=>i.id===section)?.label || "Visão geral"}</strong></div>
          <div className="topbar-actions"><div className="network-status"><span className="pulse-dot"/> Ambiente conectado</div><button className="icon-btn" title="Atualizar dados" onClick={()=>void loadData()}><RefreshCw size={17}/></button><button className="icon-btn" title="Notificações" onClick={()=>setNotice("Você está em dia com as notificações.")}><Bell size={18}/></button></div>
        </header>

        <div className="page-content">
          {error && <div className="alert error"><CircleHelp size={17}/>{error}<button className="alert-close" onClick={()=>setError("")}><X size={15}/></button></div>}
          {notice && <div className="alert success"><CheckCircle2 size={17}/>{notice}<button className="alert-close" onClick={()=>setNotice("")}><X size={15}/></button></div>}
          {section==="overview" && <Overview advertisers={advertisers} screens={screens} loading={loadingData} onNavigate={setSection}/>}
          {section==="advertisers" && <div className="section-page">
            <PageHeading eyebrow="RELACIONAMENTO COMERCIAL" title="Anunciantes" subtitle="Gerencie as empresas que anunciam na sua rede." action={<button className="primary-btn" onClick={()=>setShowAdvertiserForm(true)}><Plus size={17}/> Novo anunciante</button>}/>
            <div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, contato ou e-mail…"/></div><span className="result-count">{filteredAdvertisers.length} registro(s)</span></div>
            <div className="table-card"><div className="table-wrap"><table><thead><tr><th>EMPRESA</th><th>CONTATO</th><th>E-MAIL</th><th>STATUS</th><th>CADASTRO</th></tr></thead><tbody>
              {filteredAdvertisers.map(a=><tr key={a.id}><td><div className="company-cell"><div className="company-avatar">{a.company_name.slice(0,1).toUpperCase()}</div><strong>{a.company_name}</strong></div></td><td>{a.contact_name||"—"}</td><td>{a.email||"—"}</td><td><span className={`status-pill ${a.status==="active"?"status-active":"status-inactive"}`}><i/>{a.status==="active"?"Ativo":"Inativo"}</span></td><td>{new Date(a.created_at).toLocaleDateString("pt-BR")}</td></tr>)}
              {!filteredAdvertisers.length && <tr><td colSpan={5}><div className="empty-state"><Users size={28}/><strong>Nenhum anunciante encontrado</strong><span>Cadastre sua primeira empresa anunciante.</span></div></td></tr>}
            </tbody></table></div></div>
          </div>}
          {section==="screens" && <div className="section-page"><PageHeading eyebrow="DISPOSITIVOS DA REDE" title="Telas e locais" subtitle="Acompanhe os reprodutores cadastrados na sua rede." action={<button className="primary-btn" onClick={()=>setNotice("O cadastro e pareamento de telas será a próxima funcionalidade.")}><Plus size={17}/> Adicionar tela</button>}/><div className="table-card"><div className="table-wrap"><table><thead><tr><th>NOME DA TELA</th><th>LOCAL</th><th>CÓDIGO</th><th>STATUS</th><th>ÚLTIMA COMUNICAÇÃO</th></tr></thead><tbody>{screens.map(s=><tr key={s.id}><td><div className="company-cell"><div className="screen-avatar"><Monitor size={17}/></div><strong>{s.name}</strong></div></td><td>{s.venue_name||"Não vinculado"}</td><td><code>{s.code||"—"}</code></td><td><span className={`status-pill ${s.status==="online"?"status-active":"status-inactive"}`}><i/>{s.status==="online"?"Online":s.status==="pending"?"Pendente":"Offline"}</span></td><td>{s.last_seen_at?new Date(s.last_seen_at).toLocaleString("pt-BR"):"Nunca"}</td></tr>)}{!screens.length&&<tr><td colSpan={5}><div className="empty-state"><Monitor size={28}/><strong>Nenhuma tela cadastrada</strong><span>O cadastro de telas será habilitado na próxima entrega.</span></div></td></tr>}</tbody></table></div></div></div>}
          {!["overview","advertisers","screens"].includes(section) && <ComingSoon section={navItems.find(i=>i.id===section)?.label||section}/>}
        </div>
        <footer className="app-footer"><span>© {new Date().getFullYear()} AlfaDoor</span><span><span className="pulse-dot"/> Sistema em desenvolvimento</span></footer>
      </main>

      {showAdvertiserForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdvertiserForm(false);}}><form className="modal" onSubmit={addAdvertiser}><div className="modal-head"><div><div className="form-kicker">CADASTRO COMERCIAL</div><h2>Novo anunciante</h2><p>Preencha os dados da empresa.</p></div><button type="button" className="icon-btn" onClick={()=>setShowAdvertiserForm(false)}><X size={19}/></button></div><label>Nome da empresa *<input name="company_name" required minLength={2} maxLength={160} placeholder="Ex.: Comércio Silva"/></label><div className="form-grid"><label>Nome do contato<input name="contact_name" maxLength={120} placeholder="Responsável"/></label><label>Telefone<input name="phone" maxLength={40} placeholder="(75) 99999-9999"/></label></div><label>E-mail<input name="email" type="email" maxLength={254} placeholder="contato@empresa.com"/></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowAdvertiserForm(false)}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving?<LoaderCircle className="spin" size={17}/>:<Plus size={17}/>} Salvar anunciante</button></div></form></div>}
    </div>
  );
}

function SetupScreen() {
  return <div className="setup-page"><div className="setup-card"><div className="brand"><span className="brand-mark"><Tv2 size={23}/></span><span>Alfa<span>Door</span></span></div><div className="setup-icon"><Settings size={25}/></div><div className="form-kicker">CONFIGURAÇÃO NECESSÁRIA</div><h1>Conecte seu projeto Supabase</h1><p className="muted">A interface está pronta. Agora informe a URL e a chave publicável do seu projeto para ativar o login e os dados reais.</p><ol><li>Crie um projeto em <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Supabase Dashboard</a>.</li><li>No painel, abra <b>Project Settings → API</b> e copie a Project URL e a chave publicável (publishable/anon).</li><li>Copie <code>.env.example</code> para <code>.env</code> e preencha os valores.</li><li>Execute <code>npm run dev</code> novamente.</li></ol><div className="code-note">VITE_SUPABASE_URL=https://seu-projeto.supabase.co<br/>VITE_SUPABASE_ANON_KEY=sua-chave-publicavel</div><div className="alert warning"><ShieldCheck size={18}/> Nunca coloque a chave <b>service_role</b> no frontend. Ela dá acesso privilegiado e deve permanecer secreta.</div></div></div>;
}

function PageHeading({eyebrow,title,subtitle,action}:{eyebrow:string,title:string,subtitle:string,action?:React.ReactNode}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function Overview({advertisers,screens,loading,onNavigate}:{advertisers:Advertiser[],screens:Screen[],loading:boolean,onNavigate:(s:string)=>void}) {
  const online = screens.filter(s=>s.status==="online").length;
  return <div className="section-page">
    <PageHeading eyebrow="PAINEL DE CONTROLE" title="Visão geral" subtitle="Acompanhe o desempenho da sua rede de mídia indoor." action={<button className="secondary-btn" onClick={()=>onNavigate("advertisers")}><Users size={17}/> Ver anunciantes</button>}/>
    <div className="welcome-banner"><div className="welcome-copy"><div className="welcome-label"><span className="pulse-dot"/> SUA REDE, EM UM SÓ LUGAR</div><h2>Bem-vindo à AlfaDoor.</h2><p>Seu centro de controle para conectar marcas, locais e telas digitais.</p><button className="welcome-btn" onClick={()=>onNavigate("advertisers")}>Gerenciar anunciantes <ArrowUpRight size={16}/></button></div><div className="welcome-visual"><div className="visual-ring ring-one"/><div className="visual-ring ring-two"/><div className="visual-monitor"><Tv2 size={47}/><span>AD</span></div><div className="floating-chip chip-one"><Activity size={15}/> Rede conectada</div><div className="floating-chip chip-two"><Megaphone size={15}/> Mídia digital</div></div></div>
    <div className="stats-grid">
      <StatCard title="Anunciantes cadastrados" value={advertisers.length} icon={<Users size={19}/>} detail="Empresas na plataforma" trend="Base comercial" />
      <StatCard title="Telas cadastradas" value={screens.length} icon={<Monitor size={19}/>} detail="Dispositivos registrados" trend="Rede de exibição" />
      <StatCard title="Telas online" value={online} icon={<Wifi size={19}/>} detail="Com status online" trend={screens.length?`${Math.round(online/screens.length*100)}% da rede`:"Aguardando dispositivos"} />
      <StatCard title="Campanhas ativas" value="—" icon={<Megaphone size={19}/>} detail="Módulo em desenvolvimento" trend="Próxima etapa" />
    </div>
    <div className="lower-grid"><div className="panel-card"><div className="panel-title"><div><h3>Atividade da rede</h3><p>Resumo do ambiente</p></div><button className="icon-btn" onClick={()=>onNavigate("screens")}><ArrowUpRight size={17}/></button></div><div className="activity-row"><div className="activity-icon green"><CheckCircle2 size={18}/></div><div><strong>Conexão com a plataforma</strong><span>Supabase configurado para este ambiente</span></div><span className="status-pill status-active"><i/>Ativo</span></div><div className="activity-row"><div className="activity-icon blue"><Users size={18}/></div><div><strong>Base de anunciantes</strong><span>{loading?"Carregando dados…":`${advertisers.length} empresa(s) cadastrada(s)`}</span></div><button className="text-link" onClick={()=>onNavigate("advertisers")}>Abrir</button></div><div className="activity-row"><div className="activity-icon amber"><Monitor size={18}/></div><div><strong>Dispositivos de exibição</strong><span>{screens.length?`${screens.length} tela(s) cadastrada(s)`:"Nenhuma tela conectada ainda"}</span></div><button className="text-link" onClick={()=>onNavigate("screens")}>Abrir</button></div></div><div className="panel-card next-panel"><div className="panel-title"><div><h3>Próximas etapas</h3><p>Construindo sua rede</p></div><span className="step-count">01 / 04</span></div><div className="roadmap-item done"><span><CheckCircle2 size={16}/></span><div><strong>Conectar Supabase</strong><small>Banco e autenticação</small></div></div><div className="roadmap-item current"><span>2</span><div><strong>Cadastro de anunciantes</strong><small>Base comercial da rede</small></div></div><div className="roadmap-item"><span>3</span><div><strong>Campanhas e playlists</strong><small>Distribuição dos anúncios</small></div></div><div className="roadmap-item"><span>4</span><div><strong>AlfaDoor Player</strong><small>Reprodução em Android TV</small></div></div></div></div>
  </div>;
}

function StatCard({title,value,icon,detail,trend}:{title:string,value:React.ReactNode,icon:React.ReactNode,detail:string,trend:string}) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div><div className="stat-trend"><ArrowDownRight size={14}/>{trend}</div></div>;
}
function ComingSoon({section}:{section:string}) {
  return <div className="coming-soon"><div className="coming-icon"><Clapperboard size={27}/></div><div className="eyebrow">EM DESENVOLVIMENTO</div><h1>{section}</h1><p>Este módulo será conectado ao banco de dados nas próximas etapas da AlfaDoor.</p><div className="coming-progress"><span/><span/><span/><span/></div><small>Próxima entrega: campanhas, playlists e distribuição de mídia.</small></div>;
}

export default App;
