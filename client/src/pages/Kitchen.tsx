import { useEffect, useRef, useState } from "react";
import { Bell, Check, ChefHat, Clock3, ExternalLink, Flame, PackageCheck, Search, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel = { recebido: "Recebido", preparando: "Em preparo", pronto: "Pronto", entregue: "Entregue" } as const;

function beep() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 740;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
  } catch { /* Audio is a progressive enhancement. */ }
}

export default function Kitchen() {
  const [soundOn, setSoundOn] = useState(true);
  const [filter, setFilter] = useState<"todos" | "recebido" | "preparando" | "pronto">("todos");
  const [tableQuery, setTableQuery] = useState("");
  const latestId = useRef<number | null>(null);
  const firstLoad = useRef(true);
  const orders = trpc.orders.active.useQuery(undefined, { refetchInterval: 3000, refetchIntervalInBackground: true });
  const updateStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => { void orders.refetch(); toast.success("Status atualizado"); } });

  useEffect(() => {
    const first = orders.data?.[0]?.id ?? null;
    if (first === null) return;
    if (!firstLoad.current && latestId.current !== null && first !== latestId.current && soundOn) {
      beep();
      toast.info("Novo pedido recebido", { icon: <Bell size={16} /> });
    }
    latestId.current = first;
    firstLoad.current = false;
  }, [orders.data, soundOn]);

  const visible = orders.data?.filter((order) => {
    const matchesStatus = filter === "todos" || order.status === filter;
    const matchesTable = !tableQuery.trim() || order.tableNumber.toLowerCase().includes(tableQuery.trim().toLowerCase());
    return matchesStatus && matchesTable;
  }) || [];
  const counts = {
    todos: orders.data?.length || 0,
    recebido: orders.data?.filter((order) => order.status === "recebido").length || 0,
    preparando: orders.data?.filter((order) => order.status === "preparando").length || 0,
    pronto: orders.data?.filter((order) => order.status === "pronto").length || 0,
  };

  const setStatus = (id: number, status: "preparando" | "pronto" | "entregue") => updateStatus.mutate({ id, status });

  return <div className="min-h-screen bg-[#141713] text-[#f3f1e9]">
    <header className="border-b border-white/10 bg-[#1d201c]"><div className="container flex min-h-[78px] flex-wrap items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#e8ff61] text-xl text-[#1d201c]">✦</div><div><div className="font-display text-lg font-black tracking-[-0.04em]">BOCA & BRASA</div><div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#929b8d]">painel da cozinha · atualiza a cada 3s</div></div></div><div className="flex items-center gap-2"><button onClick={() => { setSoundOn((current) => !current); if (!soundOn) beep(); }} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-[#c5cbbf] transition hover:bg-white/5">{soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}{soundOn ? "Som ativo" : "Som desligado"}</button><a href={import.meta.env.BASE_URL} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-[#c5cbbf] transition hover:bg-white/5"><ExternalLink size={14} /> Cardápio</a></div></div></header>
    <main className="container pb-12 pt-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a9786]">fila de produção</div><h1 className="mt-2 font-display text-4xl font-black tracking-[-0.07em] sm:text-5xl">Pedidos ativos</h1><p className="mt-2 text-sm text-[#929b8d]">Acompanhe cada pedido pela mesa e atualize o preparo.</p></div><div className="flex flex-col gap-3"><label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#1d201c] px-3 text-[#929b8d]" aria-label="Filtrar por mesa"><Search size={15} /><input value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} placeholder="Filtrar mesa" className="w-28 bg-transparent text-sm text-white outline-none placeholder:text-[#788273]" /></label><div className="flex gap-2 overflow-x-auto pb-1">{(["todos", "recebido", "preparando", "pronto"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-xl border px-4 py-3 text-left transition ${filter === item ? "border-[#e8ff61] bg-[#e8ff61] text-[#1d201c]" : "border-white/10 bg-[#1d201c] text-[#aab3a5] hover:border-white/25"}`}><div className="font-mono text-[9px] uppercase tracking-[0.14em]">{item === "todos" ? "Todos" : statusLabel[item]}</div><div className="mt-1 font-display text-xl font-black">{counts[item]}</div></button>)}</div></div></div>
      {orders.isLoading ? <div className="mt-8 rounded-3xl border border-white/10 bg-[#1d201c] p-12 text-center text-[#929b8d]">Carregando pedidos…</div> : visible.length === 0 ? <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-[#1d201c] px-6 py-20 text-center"><ChefHat size={38} className="text-[#e8ff61]" /><h2 className="mt-5 font-display text-2xl font-black">Cozinha tranquila por enquanto</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#929b8d]">Novos pedidos vão aparecer aqui automaticamente assim que os clientes enviarem.</p></div> : <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((order) => <article key={order.id} className={`overflow-hidden rounded-3xl border bg-[#1d201c] ${order.status === "recebido" ? "border-[#d9b546]" : order.status === "preparando" ? "border-[#df8950]" : "border-[#79b879]"}`}><div className={`flex items-start justify-between px-5 py-4 ${order.status === "recebido" ? "bg-[#4a3d19]" : order.status === "preparando" ? "bg-[#4a2e1d]" : "bg-[#203d27]"}`}><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c4c9bb]">{order.code}</div><div className="mt-1 font-display text-3xl font-black tracking-[-0.05em]">Mesa {order.tableNumber}</div></div><div className="text-right"><div className="flex items-center justify-end gap-1.5 font-mono text-[10px] text-[#c4c9bb]"><Clock3 size={12} /> {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div><div className="mt-2 inline-flex rounded-full bg-black/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white">{statusLabel[order.status]}</div></div></div><div className="p-5"><div className="space-y-3">{order.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-white/8 pb-3 last:border-0 last:pb-0"><div className="flex gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8 font-mono text-xs font-bold text-[#e8ff61]">{item.quantity}x</span><div><div className="font-display text-sm font-bold">{item.name}</div><div className="mt-0.5 font-mono text-[10px] text-[#929b8d]">{money(item.priceCents)} cada</div></div></div><span className="font-mono text-xs text-[#bdc5b6]">{money(item.priceCents * item.quantity)}</span></div>)}</div><div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><span className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#929b8d]">Total</span><span className="font-mono text-lg font-bold">{money(order.totalCents)}</span></div><div className="mt-5">{order.status === "recebido" && <button onClick={() => setStatus(order.id, "preparando")} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e8ff61] font-display text-xs font-black uppercase tracking-[0.09em] text-[#1d201c] transition hover:bg-[#d7ee50] active:scale-[0.98]"><Flame size={16} /> Iniciar preparo</button>}{order.status === "preparando" && <button onClick={() => setStatus(order.id, "pronto")} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f1a469] font-display text-xs font-black uppercase tracking-[0.09em] text-[#3b2518] transition hover:bg-[#ffb57a] active:scale-[0.98]"><Check size={16} /> Concluir pedido</button>}{order.status === "pronto" && <button onClick={() => setStatus(order.id, "entregue")} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8bd48d] font-display text-xs font-black uppercase tracking-[0.09em] text-[#18331d] transition hover:bg-[#a0e5a2] active:scale-[0.98]"><PackageCheck size={16} /> Finalizar / entregue</button>}</div></div></article>)}</div>}
    </main>
  </div>;
}
