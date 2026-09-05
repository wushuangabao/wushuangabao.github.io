'use client';
import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, ChevronRight, Compass, ExternalLink, Gamepad2, Grid2X2, Layers3, List, Network, Search, Sparkles, Swords, Target, Users, X } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { patterns, categories, type Pattern } from './patterns';
const icons = [Swords, Target, Compass, Network, Users, Sparkles];
function Library() {
  const [category, setCategory] = useState('全部模式');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [section, setSection] = useState('模式图书馆');
  const [selected, setSelected] = useState<Pattern | null>(null);
  const { setOpenMobile } = useSidebar();
  const result = useMemo(() => patterns.filter(p => (category === '全部模式' || p.category === category) && [p.title,p.english,p.summary,p.problem,...p.tags,...p.games.map(g=>g.name)].join(' ').toLowerCase().includes(query.trim().toLowerCase())), [category,query]);
  const navigate = (name: string) => { setSection(name); setOpenMobile(false); };
  return <>
    <a className="skip-link" href="#main">跳转到内容</a>
    <Sidebar className="library-sidebar">
      <SidebarHeader className="brand"><div className="brand-mark"><Layers3 size={25}/></div><div><strong>游构<span>中文模式库</span></strong><small>GAME DESIGN PATTERNS</small></div></SidebarHeader>
      <SidebarContent className="nav-content">
        <p className="nav-label">探索图书馆</p>
        <nav aria-label="主导航">{[{name:'模式图书馆',icon:BookOpen},{name:'游戏案例',icon:Gamepad2},{name:'阅读指南',icon:Compass}].map(({name,icon:Icon})=><button key={name} onClick={()=>navigate(name)} className={`nav-item ${section===name?'active':''}`} aria-current={section===name?'page':undefined}><Icon size={19}/>{name}{name==='模式图书馆'&&<span className="nav-count">{patterns.length}</span>}</button>)}</nav>
        <div className="nav-divider"/><p className="nav-label">按设计维度浏览</p>
        <nav aria-label="模式分类">{categories.slice(1).map((name,i)=>{const Icon=icons[i];return <button className={`nav-item category-link ${section==='模式图书馆'&&category===name?'chosen':''}`} key={name} onClick={()=>{setCategory(name);navigate('模式图书馆')}}><Icon size={17}/>{name}<small>{patterns.filter(p=>p.category===name).length}</small></button>})}</nav>
        <div className="sidebar-note"><Network size={22}/><h3>从一个模式，到一种语言</h3><p>结合问题、情境与关联模式，寻找适合你的设计解法。</p><button onClick={()=>navigate('阅读指南')}>了解如何使用 <ArrowRight size={15}/></button></div>
      </SidebarContent>
      <SidebarFooter className="sidebar-footer"><span className="status-dot"/> 中文精选 · 持续积累 <a href="https://patternlanguageforgamedesign.com/" target="_blank" rel="noreferrer" aria-label="访问英文参考网站"><ExternalLink size={16}/></a></SidebarFooter>
    </Sidebar>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><SidebarTrigger className="mobile-toggle" aria-label="打开导航"/><span>探索</span><ChevronRight size={14}/><strong>{section}</strong></div><a className="back-home" href="/">返回个人网站 <ExternalLink size={14}/></a></header>
      <main id="main" className="main-content">
        {section==='模式图书馆'?<>
          <div className="page-heading"><div><div className="eyebrow"><span/> THE PATTERN LIBRARY</div><h1>游戏设计模式图书馆<span>。</span></h1><p>拆解游戏的巧思，找到可复用的设计方法。</p></div><div className="library-index"><strong>{patterns.length}</strong><span>篇中文模式<br/>6 个设计维度</span></div></div>
          <div className="search-bar"><Search size={22}/><Input aria-label="搜索模式、设计问题或游戏" placeholder="搜索模式、设计问题或游戏名称…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="清空搜索" onClick={()=>setQuery('')}><X size={18}/></button>}<span className="search-hint">中英文检索</span></div>
          <div className="category-pills" aria-label="筛选分类">{categories.map(c=><button aria-pressed={category===c} onClick={()=>setCategory(c)} className={category===c?'selected':''} key={c}>{c}{c==='全部模式'&&<span>{patterns.length}</span>}</button>)}</div>
          <div className="results-toolbar"><p aria-live="polite">{category==='全部模式'?'全部设计模式':category}<span>{result.length} 篇模式</span></p><div className="view-toggle" aria-label="显示方式"><button aria-label="卡片视图" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><Grid2X2 size={17}/></button><button aria-label="列表视图" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={19}/></button></div></div>
          {result.length?<div className={`pattern-grid ${view==='list'?'list-view':''}`}>{result.map(p=><button className="pattern-card" key={p.id} onClick={()=>setSelected(p)}><div className={`pattern-diagram tone-${p.tone}`}><span className="pattern-number">PATTERN / {p.id}</span><FlowDiagram kind={p.diagram}/></div><div className="card-copy"><div className="card-meta"><span className={`category-dot tone-${p.tone}`}/>{p.category}<span className="read-time">设计方法</span></div><h2>{p.title}<ArrowRight size={19}/></h2><div className="english-title">{p.english}</div><p>{p.summary}</p><div className="tags">{p.tags.map(t=><span key={t}>{t}</span>)}</div><div className="card-bottom"><Gamepad2 size={15}/><span>{p.games.map(g=>g.name).join('、')}</span><ChevronRight size={15}/></div></div></button>)}</div>:<div className="no-results"><Search size={32}/><h2>没有找到匹配的模式</h2><p>试试“反馈”“探索”或一个游戏名称，也可以清除筛选。</p><button className="primary-button" onClick={()=>{setQuery('');setCategory('全部模式')}}>查看全部模式</button></div>}
        </>:section==='游戏案例'?<><div className="eyebrow">GAMES AS DESIGN REFERENCES</div><h1>从游戏看设计。</h1><p className="intro">把具体体验和设计模式联系起来。以下为本站的设计解读。</p><div className="games-grid">{Array.from(new Set(patterns.flatMap(p=>p.games.map(g=>g.name)))).map(name=><article className="game-card" key={name}><Gamepad2/><h2>{name}</h2>{patterns.filter(p=>p.games.some(g=>g.name===name)).map(p=><button key={p.id} onClick={()=>setSelected(p)}>{p.title}<ArrowRight size={17}/></button>)}</article>)}</div></>:<article className="guide"><div className="eyebrow">A GUIDE TO PATTERN THINKING</div><h1>用模式，提出更好的设计问题。</h1><p className="intro">设计模式是一种在特定情境下，回应反复出现的设计问题的方法。它帮助你解释一个机制为什么有效，以及什么时候可能失效。</p>{[{title:'先找到问题，再寻找模式',text:'从你正在解决的问题出发，例如“玩家为什么不愿意探索？”或“失败后如何鼓励再次尝试？”。搜索问题中的关键词，浏览相关设计维度。'},{title:'阅读情境，也阅读代价',text:'每篇模式包含设计问题、应用方法、游戏案例与注意事项。相同机制放在不同的玩家目标、节奏和系统中，可能带来完全不同的体验。'},{title:'组合模式，在原型中验证',text:'沿着关联模式继续阅读，把多个方法组合成设计假设。用小型原型观察玩家行为，再决定是否保留，而不是将模式当作固定配方。'}].map((s,i)=><section key={s.title}><span className="guide-number">0{i+1}</span><div><h2>{s.title}</h2><p>{s.text}</p></div></section>)}<div className="source-note"><h2>关于内容与来源</h2><p>本站是独立中文游戏设计资料库。当前 {patterns.length} 篇条目为自行编写的入门内容，游戏案例为设计解读；并非英文站的官方中文版本或逐篇译文。</p><p>信息组织参考 Chris Barney 的 <a href="https://patternlanguageforgamedesign.com/" target="_blank" rel="noreferrer">Pattern Language for Game Design <ExternalLink size={14}/></a>，使用“问题—方法—案例—关联”的结构来阅读和讨论游戏设计。</p></div><button className="primary-button" onClick={()=>navigate('模式图书馆')}>开始探索模式 <ArrowRight size={17}/></button></article>}
        <footer className="content-footer"><span>游构 / 游戏设计模式图书馆</span><button onClick={()=>navigate('阅读指南')}>关于内容与来源 <ArrowRight size={14}/></button></footer>
      </main>
    </div>
    <Sheet open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}}><SheetContent className="pattern-detail" showCloseButton={false}>{selected&&<><SheetHeader><div className="detail-topline"><span>PATTERN / {selected.id} · {selected.category}</span><SheetClose aria-label="关闭详情" className="close-detail"><X size={22}/></SheetClose></div><SheetTitle className="detail-title">{selected.title}</SheetTitle><SheetDescription className="detail-description">{selected.english}</SheetDescription></SheetHeader><div className="detail-body"><p className="detail-lead">{selected.summary}</p><section><h3>01 <span>设计问题</span></h3><p>{selected.problem}</p></section><section><h3>02 <span>应用方法</span></h3><p>{selected.solution}</p></section><section><h3>03 <span>游戏案例 · 本站解读</span></h3>{selected.games.map(g=><div className="example" key={g.name}><h4><Gamepad2 size={18}/>{g.name}</h4><p>{g.note}</p></div>)}</section><section className="caution"><h3>04 <span>使用时留意</span></h3><p>{selected.caution}</p></section><section><h3>05 <span>关联模式</span></h3><div className="related-patterns">{selected.related.map(id=>patterns.find(p=>p.id===id)).filter((p):p is Pattern=>!!p).map(p=><button key={p.id} onClick={()=>{setSelected(p);document.querySelector('.pattern-detail')?.scrollTo({top:0})}}>{p.title}<ArrowRight size={16}/></button>)}</div></section><p className="detail-source">独立中文编写 · 用于设计学习与讨论</p></div></>}</SheetContent></Sheet>
  </>;
}
function FlowDiagram({kind}:{kind:number}) {
  const labels = [['行动','反馈','再尝试'],['风险','选择','回报'],['挑战','掌握','新挑战'],['线索','探索','发现'],['资源','取舍','策略'],['目标','协作','达成']][kind];
  return <div className="flow-diagram" aria-label={labels.join('，')}><div className="flow-nodes">{labels.map((label,i)=><div className="flow-step" key={label}><span className={`flow-node ${i===1?'node-solid':''}`}>{i===0?<Target size={22}/>:i===1?<Layers3 size={24}/>:<Sparkles size={22}/>}</span>{i<2&&<span className="flow-arrow"><ArrowRight size={17}/></span>}<small>{label}</small></div>)}</div><div className="flow-return"/><span className="diagram-caption">{labels.join(' → ')}</span></div>;
}
export default function Home(){return <SidebarProvider><Library/></SidebarProvider>}
