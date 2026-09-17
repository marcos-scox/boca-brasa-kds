import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Clock3, ExternalLink, Minus, Plus, ShoppingBag, Sparkles, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Product = { id: string; name: string; description: string; priceCents: number; category: string; emoji: string; featured?: boolean };
type CartItem = Product & { quantity: number };

const products: Product[] = [
  { id: "x-burger", name: "X-Burger", description: "Pão macio, hambúrguer, queijo e molho da casa", priceCents: 1500, category: "Hambúrgueres", emoji: "🍔", featured: true },
  { id: "x-salada", name: "X-Salada", description: "Queijo, alface, tomate e maionese artesanal", priceCents: 1800, category: "Hambúrgueres", emoji: "🥬", featured: true },
  { id: "x-bacon", name: "X-Bacon", description: "Bacon crocante, queijo derretido e molho especial", priceCents: 2200, category: "Hambúrgueres", emoji: "🥓", featured: true },
  { id: "x-tudo", name: "X-Tudo", description: "A escolha generosa para quem chegou com fome", priceCents: 2800, category: "Hambúrgueres", emoji: "🔥", featured: true },
  { id: "cachorro-quente", name: "Cachorro-quente", description: "Salsicha, milho, batata palha e os molhos clássicos", priceCents: 1200, category: "Lanches & acompanhamentos", emoji: "🌭" },
  { id: "batata-frita", name: "Batata frita", description: "Porção sequinha com sal da casa", priceCents: 1000, category: "Lanches & acompanhamentos", emoji: "🍟" },
  { id: "coxinha", name: "Coxinha", description: "Massa cremosa, frango temperado e casquinha dourada", priceCents: 700, category: "Salgados", emoji: "🥟" },
  { id: "pastel-carne", name: "Pastel de carne", description: "Recheio bem temperado em massa crocante", priceCents: 800, category: "Salgados", emoji: "🥠" },
  { id: "refri-lata", name: "Refrigerante lata", description: "Consulte os sabores disponíveis na geladeira", priceCents: 600, category: "Bebidas", emoji: "🥤" },
  { id: "suco-natural", name: "Suco natural", description: "Feito na hora e servido bem gelado", priceCents: 800, category: "Bebidas", emoji: "🍊" },
];

const categories = ["Todos", "Hambúrgueres", "Lanches & acompanhamentos", "Salgados", "Bebidas"];
const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getInitialTable() {
  const table = new URLSearchParams(window.location.search).get("mesa");
  return table?.trim() || localStorage.getItem("lanchonete-table") || "";
}

function statusCopy(status?: string) {
  if (status === "preparando") return { label: "Em preparo", note: "A cozinha já está cuidando do seu pedido.", tone: "orange" };
  if (status === "pronto") return { label: "Pedido pronto!", note: "Seu lanche está a caminho da mesa.", tone: "green" };
  return { label: "Pedido recebido", note: "Aguardando a cozinha começar o preparo.", tone: "yellow" };
}

export default function Home() {
  const [table, setTable] = useState(getInitialTable);
  const [tableDraft, setTableDraft] = useState(table);
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(() => Number(localStorage.getItem("lanchonete-order-id")) || null);

  const settings = trpc.settings.get.useQuery(undefined, { staleTime: 30_000 });
  const createOrder = trpc.orders.create.useMutation();
  const order = trpc.orders.getById.useQuery(
    { id: currentOrderId ?? 0 },
    { enabled: Boolean(currentOrderId), refetchInterval: 3000, refetchIntervalInBackground: true },
  );

  useEffect(() => {
    if (table) localStorage.setItem("lanchonete-table", table);
  }, [table]);

  const filteredProducts = useMemo(() => category === "Todos" ? products : products.filter((product) => product.category === category), [category]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado`, { duration: 1600 });
  };

  const changeQuantity = (id: string, amount: number) => {
    setCart((current) => current.flatMap((item) => item.id === id ? (item.quantity + amount > 0 ? [{ ...item, quantity: item.quantity + amount }] : []) : [item]));
  };

  const setTableNumber = (event: React.FormEvent) => {
    event.preventDefault();
    const value = tableDraft.trim();
    if (!value) return;
    setTable(value);
  };

  const finishOrder = async () => {
    if (!table) {
      setTableDraft("");
      toast.error("Informe o número da mesa antes de pedir");
      return;
    }
    if (!cart.length) return;
    try {
      const created = await createOrder.mutateAsync({
        tableNumber: table,
        items: cart.map((item) => ({ id: item.id, name: item.name, priceCents: item.priceCents, quantity: item.quantity })),
      });
      localStorage.setItem("lanchonete-order-id", String(created.id));
      setCurrentOrderId(created.id);
      setCart([]);
      setCartOpen(false);
      setStatusOpen(true);
      const phone = settings.data?.whatsapp || "5598984808565";
      const lines = created.items.map((item) => `${item.quantity}x ${item.name} — ${money(item.priceCents * item.quantity)}`).join("%0A");
      const message = `Olá! Pedido ${created.code}, mesa ${created.tableNumber}.%0A${lines}%0ATotal: ${money(created.totalCents)}`;
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
      toast.success("Pedido enviado para a cozinha");
    } catch {
      toast.error("Não foi possível enviar agora. Tente novamente.");
    }
  };

  const currentStatus = statusCopy(order.data?.status);

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#1d201c]">
      <header className="sticky top-0 z-30 border-b border-[#d9d3c7] bg-[#f6f2ea]/95 backdrop-blur">
        <div className="container flex h-[76px] items-center justify-between gap-4">
            <a href={import.meta.env.BASE_URL} className="flex items-center gap-3" aria-label="Boca & Brasa início">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#1d201c] text-xl text-[#e8ff61] shadow-[4px_4px_0_#c8d944]">✦</div>
            <div><div className="font-display text-lg font-black leading-none tracking-[-0.04em]">BOCA & BRASA</div><div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[#7c8177]">lanchonete de bairro</div></div>
          </a>
            <div className="flex items-center gap-2">
              <a href={`${import.meta.env.BASE_URL}cozinha`} className="hidden items-center gap-1.5 rounded-xl border border-[#d9d3c7] bg-white px-3 py-2 font-display text-[10px] font-bold sm:flex"><ExternalLink size={13} /> Cozinha</a>
            <div className="hidden text-right sm:block"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7c8177]">sua mesa</div><div className="font-display text-sm font-bold">{table ? `#${table}` : "não definida"}</div></div>
            <button onClick={() => setStatusOpen(true)} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#d9d3c7] bg-white text-[#1d201c] transition hover:-translate-y-0.5" aria-label="Acompanhar pedido"><Clock3 size={18} /></button>
          </div>
        </div>
      </header>

      {!table && <div className="border-b border-[#d6e776] bg-[#e8ff61]"><form onSubmit={setTableNumber} className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-display text-sm font-black uppercase tracking-[-0.02em]">Antes de começar, conte pra gente</div><div className="mt-1 text-xs text-[#596048]">Digite o número da sua mesa para entregarmos tudo certinho.</div></div><div className="flex gap-2"><input value={tableDraft} onChange={(event) => setTableDraft(event.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="Mesa" className="h-11 w-24 rounded-xl border border-[#bbc95b] bg-white px-3 font-display text-center font-bold outline-none ring-[#1d201c] focus:ring-2" aria-label="Número da mesa" /><button className="h-11 rounded-xl bg-[#1d201c] px-4 font-display text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#34392f]">Confirmar</button></div></form></div>}

      <main className="container pb-32 pt-8 sm:pt-12">
        <section className="relative overflow-hidden rounded-[28px] bg-[#1d201c] px-6 py-8 text-white sm:px-10 sm:py-11">
          <div className="relative z-10 max-w-xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#34392f] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#e8ff61]"><Sparkles size={12} /> feito na hora, sem pressa</div><h1 className="font-display text-4xl font-black leading-[0.96] tracking-[-0.07em] sm:text-6xl">Seu lanche.<br /><span className="text-[#e8ff61]">Seu momento.</span></h1><p className="mt-5 max-w-sm text-sm leading-6 text-[#bdc5b6]">Sabor de verdade, porções honestas e aquele molho que faz voltar amanhã.</p><a href="#cardapio" className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#e8ff61] px-5 py-3 font-display text-xs font-black uppercase tracking-[0.1em] text-[#1d201c] transition hover:gap-4">ver o cardápio <ArrowRight size={15} /></a></div>
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[28px] border-[#e8ff61]/20 sm:h-80 sm:w-80" /><div className="absolute -bottom-24 right-10 text-[180px] leading-none opacity-15">🍔</div>
        </section>

        <section id="cardapio" className="scroll-mt-24 pt-9 sm:pt-12"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8f85]">01 / escolha seu pedido</div><h2 className="mt-2 font-display text-3xl font-black tracking-[-0.06em] sm:text-4xl">Cardápio da casa</h2></div><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border px-3 py-2 font-display text-[11px] font-bold transition ${category === item ? "border-[#1d201c] bg-[#1d201c] text-white" : "border-[#d9d3c7] bg-transparent text-[#6d7269] hover:border-[#1d201c]"}`}>{item}</button>)}</div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product, index) => <article key={product.id} className={`group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[22px] border border-[#ded8cc] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(29,32,28,0.08)] ${product.featured && index === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}><div><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6f2ea] text-3xl transition group-hover:scale-110">{product.emoji}</div><span className="font-mono text-[10px] text-[#969b91]">{product.category === "Hambúrgueres" ? "01" : product.category === "Bebidas" ? "04" : product.category === "Salgados" ? "03" : "02"}</span></div><h3 className="mt-5 font-display text-xl font-extrabold tracking-[-0.04em]">{product.name}</h3><p className="mt-1.5 max-w-[240px] text-xs leading-5 text-[#7a8076]">{product.description}</p></div><div className="mt-5 flex items-center justify-between"><span className="font-mono text-sm font-bold">{money(product.priceCents)}</span><button onClick={() => addToCart(product)} className="flex h-10 items-center gap-2 rounded-full bg-[#e8ff61] px-4 font-display text-[11px] font-black uppercase tracking-[0.08em] text-[#1d201c] transition hover:bg-[#d7ee50] active:scale-95"><Plus size={15} /> adicionar</button></div></article>)}</div>
        </section>

        <section className="mt-12 grid gap-3 sm:grid-cols-3"><div className="rounded-[20px] bg-[#e8ff61] p-5"><Utensils size={20} /><div className="mt-8 font-display text-lg font-black">Tudo feito na hora</div><p className="mt-1 text-xs leading-5 text-[#596048]">O pedido só entra na chapa depois que você confirma.</p></div><div className="rounded-[20px] bg-[#dfebe0] p-5"><ShoppingBag size={20} /><div className="mt-8 font-display text-lg font-black">Peça sem fila</div><p className="mt-1 text-xs leading-5 text-[#59685c]">Escolha direto da mesa e acompanhe cada etapa.</p></div><div className="rounded-[20px] bg-[#f2d6c5] p-5"><Sparkles size={20} /><div className="mt-8 font-display text-lg font-black">Molho da casa</div><p className="mt-1 text-xs leading-5 text-[#7e5944]">Receita exclusiva para deixar tudo ainda mais gostoso.</p></div></section>
      </main>

      {cartCount > 0 && <button onClick={() => setCartOpen(true)} className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl bg-[#1d201c] px-5 py-4 text-white shadow-[0_12px_30px_rgba(29,32,28,0.25)] transition hover:-translate-y-1"><span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8ff61] font-display text-xs font-black text-[#1d201c]">{cartCount}</span><span className="font-display text-sm font-bold">Ver meu pedido</span></span><span className="flex items-center gap-2 font-mono text-sm font-bold">{money(totalCents)} <ArrowRight size={16} /></span></button>}

      {(cartOpen || statusOpen) && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1d201c]/45 p-0 sm:items-center sm:p-5" onClick={() => { setCartOpen(false); setStatusOpen(false); }}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[#f6f2ea] p-5 sm:rounded-[28px] sm:p-7" onClick={(event) => event.stopPropagation()}>
        {cartOpen && <><div className="flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8f85]">02 / revisão</div><h2 className="mt-2 font-display text-3xl font-black tracking-[-0.06em]">Seu pedido</h2></div><button onClick={() => setCartOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d3c7]"><X size={17} /></button></div>{!table && <div className="mt-5 rounded-2xl border border-[#e1c74b] bg-[#fff8d1] p-4 text-sm"><strong>Qual é a sua mesa?</strong><div className="mt-3 flex gap-2"><input value={tableDraft} onChange={(event) => setTableDraft(event.target.value.replace(/\D/g, "").slice(0, 3))} className="h-10 w-20 rounded-lg border border-[#d6c875] bg-white px-3 text-center outline-none" inputMode="numeric" /><button onClick={() => { if (tableDraft.trim()) setTable(tableDraft.trim()); }} className="rounded-lg bg-[#1d201c] px-3 text-xs font-bold text-white">Salvar</button></div></div>}<div className="mt-6 space-y-3">{cart.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f6f2ea] text-2xl">{item.emoji}</div><div className="min-w-0 flex-1"><div className="truncate font-display text-sm font-bold">{item.name}</div><div className="mt-1 font-mono text-xs text-[#7a8076]">{money(item.priceCents * item.quantity)}</div></div><div className="flex items-center gap-2 rounded-full border border-[#ded8cc] px-2 py-1"><button onClick={() => changeQuantity(item.id, -1)} className="p-1"><Minus size={13} /></button><span className="w-4 text-center font-mono text-xs">{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} className="p-1"><Plus size={13} /></button></div></div>)}</div><div className="mt-7 flex items-center justify-between border-t border-[#d9d3c7] pt-5"><span className="font-display text-sm font-bold">Total do pedido</span><span className="font-mono text-xl font-bold">{money(totalCents)}</span></div><button disabled={createOrder.isPending || !table} onClick={finishOrder} className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#1d201c] font-display text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#34392f] disabled:cursor-not-allowed disabled:opacity-50">{createOrder.isPending ? "Enviando…" : "Finalizar pedido"}<ArrowRight size={18} /></button><p className="mt-3 text-center text-[11px] leading-5 text-[#888d83]">Ao finalizar, você também poderá enviar o resumo pelo WhatsApp da lanchonete.</p></>}
        {statusOpen && <><div className="flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8f85]">03 / acompanhamento</div><h2 className="mt-2 font-display text-3xl font-black tracking-[-0.06em]">Acompanhe seu pedido</h2></div><button onClick={() => setStatusOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d3c7]"><X size={17} /></button></div>{!currentOrderId ? <div className="mt-8 rounded-2xl bg-white p-6 text-center"><div className="text-4xl">🍔</div><div className="mt-3 font-display font-bold">Ainda não há pedido ativo</div><p className="mt-1 text-sm text-[#7a8076]">Seu pedido aparecerá aqui assim que você finalizar.</p></div> : <div className="mt-7"><div className={`rounded-2xl p-5 ${currentStatus.tone === "green" ? "bg-[#d8f1d8]" : currentStatus.tone === "orange" ? "bg-[#ffe1c3]" : "bg-[#fff1a8]"}`}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">{currentStatus.tone === "green" ? <Check size={21} /> : <Clock3 size={21} />}</div><div><div className="font-display text-lg font-black">{currentStatus.label}</div><div className="mt-1 text-xs text-[#656d5f]">{currentStatus.note}</div></div></div></div><div className="mt-5 rounded-2xl bg-white p-5"><div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#8a8f85]"><span>Pedido {order.data?.code || "…"}</span><span>Mesa {order.data?.tableNumber || table}</span></div><div className="mt-4 space-y-2">{order.data?.items.map((item) => <div key={item.id} className="flex justify-between text-sm"><span><strong>{item.quantity}x</strong> {item.name}</span><span className="font-mono text-xs">{money(item.priceCents * item.quantity)}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-[#eee9df] pt-4 font-bold"><span>Total</span><span className="font-mono">{money(order.data?.totalCents || 0)}</span></div></div><button onClick={() => { localStorage.removeItem("lanchonete-order-id"); setCurrentOrderId(null); setStatusOpen(false); }} className="mt-5 w-full text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8f85] underline underline-offset-4">limpar pedido da tela</button></div>}</>}
      </div></div>}
    </div>
  );
}
