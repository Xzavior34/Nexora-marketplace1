import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Categories from "@/components/Categories";
import TrustSection from "@/components/TrustSection";
import ImpactSection from "@/components/ImpactSection";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import SmartMatchFeed from "@/components/SmartMatchFeed";
import VaultCard from "@/components/dashboard/VaultCard";
import { ScrollFloatWrapper } from "@/components/ui/ScrollFloatWrapper";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, BarChart3, TrendingUp, CheckCircle2, Wallet, Send, Plus, Search, UserCheck, ShoppingBag, Star, MapPin } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  return (
    <main className="min-h-screen">
      <SEOHead
        title="Nexora — Nigeria's National Economic Opportunity Platform"
        description="Nigeria's intelligent national gig economy. Verified professionals, AI-matched opportunities, Squad Escrow security, and Ajo peer-to-peer savings. Economic empowerment for every Nigerian."
        keywords="Nexora, Nigeria gig economy, economic empowerment, verified professionals, AI marketplace, Squad escrow, Ajo savings, artisan Nigeria, national opportunity platform"
        ogType="website"
        canonical="https://nexora.ng"
      />
      <HeroSection />

      {/* Feature Showcase Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" />
        {/* Bottom fade into dark section */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#030303] pointer-events-none z-20" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
              A Complete Ecosystem
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Experience the power of our AI matching engine, secure financial tools, and real-time collaboration directly from your dashboard.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: SmartMatchFeed and Chat */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <ScrollFloatWrapper intensity={0.8}>
                <div className="h-full p-6 md:p-8 rounded-[2rem] bg-secondary/20 border border-border/50 shadow-2xl backdrop-blur-sm overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <SmartMatchFeed userId={user?.id || "demo"} demoMode={true} />
                </div>
              </ScrollFloatWrapper>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Real-time Chat Mock */}
                <ScrollFloatWrapper intensity={1.2}>
                  <div className="h-full p-6 rounded-[2rem] bg-gradient-to-b from-background to-secondary/30 border border-border/50 shadow-xl backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <MessageSquare className="w-24 h-24 text-brand" />
                    </div>
                    <div className="flex items-center gap-2 mb-6 relative z-10">
                      <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-brand" />
                      </div>
                      <h3 className="font-bold text-lg">Instant Chat</h3>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      {/* Incoming Message */}
                      <div className="flex gap-3 items-end">
                        <div className="h-8 w-8 rounded-full bg-muted shrink-0 overflow-hidden ring-2 ring-background shadow-md">
                           <img src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&q=80&w=100" alt="Client" className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-secondary/60 backdrop-blur-xl rounded-2xl rounded-bl-sm p-3.5 text-sm border border-white/10 shadow-lg relative">
                          <p className="text-foreground leading-relaxed">Hi, I need this done by Friday. Can you manage?</p>
                          <span className="text-[10px] text-muted-foreground absolute -bottom-5 left-1">10:42 AM</span>
                        </div>
                      </div>
                      
                      {/* Outgoing Message */}
                      <div className="flex gap-3 items-end flex-row-reverse mt-6">
                        <div className="bg-brand text-brand-foreground rounded-2xl rounded-br-sm p-3.5 text-sm shadow-[0_0_15px_rgba(var(--brand),0.3)] border border-white/20 relative">
                          <p className="leading-relaxed">Absolutely! I've already started the draft.</p>
                          <span className="text-[10px] text-brand-foreground/70 absolute -bottom-5 right-1 flex items-center gap-1">
                            10:45 AM <CheckCircle2 className="w-3 h-3" />
                          </span>
                        </div>
                      </div>

                      {/* Typing Indicator */}
                      <div className="flex gap-3 items-center mt-8">
                        <div className="h-6 w-6 rounded-full bg-muted shrink-0 overflow-hidden ring-2 ring-background shadow-md opacity-70">
                           <img src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&q=80&w=100" alt="Client" className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-secondary/40 backdrop-blur-md rounded-2xl rounded-bl-sm p-2.5 px-3 border border-white/5 flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2">
                         <div className="flex-1 bg-background/80 backdrop-blur-sm rounded-full h-11 border border-white/10 flex items-center px-4 text-xs text-muted-foreground shadow-inner">Type a message...</div>
                         <div className="h-11 w-11 bg-brand rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(var(--brand),0.4)] text-brand-foreground shrink-0 transition-transform hover:scale-105 cursor-pointer border border-white/20">
                           <Send className="w-4 h-4 ml-0.5" />
                         </div>
                      </div>
                    </div>
                  </div>
                </ScrollFloatWrapper>

                {/* Gig Analytics Mock */}
                <ScrollFloatWrapper intensity={1}>
                  <div className="h-full p-6 rounded-[2rem] glass-premium shadow-xl relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-sky-500/10 to-transparent" />
                    <div className="flex items-center gap-2 mb-6 relative z-10">
                      <div className="h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-sky-500" />
                      </div>
                      <h3 className="font-bold text-lg">Performance</h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground font-medium">Profile Views</span>
                          <span className="font-bold text-sky-500 flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 rounded-md"><TrendingUp className="w-3 h-3"/> +24%</span>
                        </div>
                        <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600 tracking-tight">1,482</p>
                      </div>

                      {/* Fake Sparkline Graph */}
                      <div className="h-16 w-full flex items-end justify-between gap-1 border-b border-border/30 pb-2">
                         {[40, 60, 45, 80, 50, 90, 70, 100].map((h, i) => (
                           <div key={i} className="w-full bg-sky-500/20 rounded-t-sm relative group overflow-hidden" style={{ height: `${h}%` }}>
                             <div className="absolute bottom-0 w-full bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity h-full" />
                           </div>
                         ))}
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 backdrop-blur-sm border border-white/5 shadow-sm group-hover:border-sky-500/30 transition-colors">
                           <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                               <CheckCircle2 className="w-4 h-4 text-green-500" />
                             </div>
                             <span className="text-sm font-semibold">Completed Gigs</span>
                           </div>
                           <span className="font-bold text-lg">48</span>
                        </div>
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 backdrop-blur-sm border border-white/5 shadow-sm group-hover:border-brand/30 transition-colors relative overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="flex items-center gap-3 relative z-10">
                             <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center">
                               <Wallet className="w-4 h-4 text-brand" />
                             </div>
                             <span className="text-sm font-semibold">Total Earnings</span>
                           </div>
                           <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand to-violet-500 text-lg relative z-10">₦1.2M</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollFloatWrapper>
              </div>
            </div>

            {/* Right Column: Ajo Vault */}
            <div className="flex flex-col gap-6 lg:col-span-1 h-full">
              <ScrollFloatWrapper intensity={1.5} className="h-full">
                <div className="h-full rounded-[2rem] bg-gradient-to-b from-brand/10 to-transparent p-1 border border-brand/20 shadow-brand/10 group overflow-hidden">
                   <div className="h-full w-full rounded-[1.75rem] overflow-hidden bg-background">
                     <VaultCard 
                      userId={user?.id || "demo"} 
                      vaultBalance={2450000} 
                      autoSavePercentage={5} 
                      walletBalance={850000} 
                      onChanged={() => {}} 
                     />
                     <div className="p-6 pt-2">
                       <h4 className="font-bold text-lg mb-2">Automated Wealth</h4>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                         The AjoSquad Vault skims a percentage of your gig earnings automatically, building your wealth without you even thinking about it. Securely powered by Squad Escrow.
                       </p>
                     </div>
                   </div>
                </div>
              </ScrollFloatWrapper>
            </div>

          </div>

          {/* Second row — full-size feature mocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mt-8">
            {/* Post a Gig */}
            <ScrollFloatWrapper intensity={1}>
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-b from-background to-secondary/30 border border-border/50 shadow-xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Plus className="w-24 h-24 text-emerald-500" /></div>
                <div className="flex items-center gap-2 mb-6"><div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><Plus className="w-4 h-4 text-emerald-500" /></div><h3 className="font-bold text-lg">Post a Gig</h3></div>
                <div className="space-y-3 relative z-10">
                  <div className="rounded-xl bg-secondary/50 border border-border/30 p-3"><p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Gig Title</p><p className="text-sm font-medium">Need a React Developer for Dashboard</p></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-secondary/50 border border-border/30 p-3"><p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Budget</p><p className="text-sm font-bold text-emerald-500">₦45,000</p></div>
                    <div className="rounded-xl bg-secondary/50 border border-border/30 p-3"><p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Deadline</p><p className="text-sm font-medium">3 days</p></div>
                  </div>
                  <div className="rounded-xl bg-secondary/50 border border-border/30 p-3"><p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Skills</p><div className="flex gap-1.5 flex-wrap">{['React','TypeScript','Tailwind'].map(s=><span key={s} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">{s}</span>)}</div></div>
                  <div className="flex items-center gap-3 pt-1"><div className="flex-1 h-11 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer">Publish Gig →</div><span className="text-xs text-muted-foreground">AI matches <span className="text-emerald-500 font-bold">24 pros</span></span></div>
                </div>
              </div>
            </ScrollFloatWrapper>

            {/* Find & Hire */}
            <ScrollFloatWrapper intensity={1}>
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-b from-background to-secondary/30 border border-border/50 shadow-xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Search className="w-24 h-24 text-violet-500" /></div>
                <div className="flex items-center gap-2 mb-6"><div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center"><Search className="w-4 h-4 text-violet-500" /></div><h3 className="font-bold text-lg">Find & Hire</h3></div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-2 bg-secondary/50 border border-border/30 rounded-xl p-3"><Search className="w-4 h-4 text-muted-foreground shrink-0" /><span className="text-sm text-muted-foreground">Search "React Developer Lagos"</span></div>
                  {[{n:'Adebayo O.',s:'React Dev',l:'Lagos',r:'₦8k/hr',m:94,t:'GOLD'},{n:'Chioma N.',s:'Full Stack',l:'Abuja',r:'₦6k/hr',m:87,t:'SILVER'},{n:'Ibrahim M.',s:'Frontend',l:'Kano',r:'₦5k/hr',m:79,t:'BRONZE'}].map(p=>(
                    <div key={p.n} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/30 hover:border-violet-500/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">{p.n.split(' ').map(x=>x[0]).join('')}</div>
                      <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-bold truncate">{p.n}</p><span className="text-[8px] font-bold bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-full">{p.t}</span></div><p className="text-[10px] text-muted-foreground">{p.s} · {p.l} · <span className="text-violet-500 font-bold">{p.m}% match</span></p></div>
                      <div className="text-right shrink-0"><p className="text-xs font-bold">{p.r}</p><div className="flex gap-0.5">{[...Array(5)].map((_,j)=><span key={j} className="text-yellow-400 text-[8px]">★</span>)}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollFloatWrapper>
          </div>

          {/* Third row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mt-6">
            {/* Marketplace */}
            <ScrollFloatWrapper intensity={1}>
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-b from-background to-secondary/30 border border-border/50 shadow-xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ShoppingBag className="w-24 h-24 text-amber-500" /></div>
                <div className="flex items-center gap-2 mb-6"><div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-amber-500" /></div><h3 className="font-bold text-lg">Marketplace</h3></div>
                <div className="grid grid-cols-2 gap-3 relative z-10">
                  {[{n:'Logo Design Pack',p:'₦3,500',s:'Joy A.'},{n:'Social Media Kit',p:'₦5,000',s:'Tunde K.'},{n:'Website Template',p:'₦12,000',s:'Ade B.'},{n:'Business Cards',p:'₦2,000',s:'Funke O.'}].map(it=>(
                    <div key={it.n} className="p-3 rounded-xl bg-secondary/50 border border-border/30 hover:border-amber-500/30 transition-colors cursor-pointer">
                      <div className="w-full h-20 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 mb-2 flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-amber-500/30" /></div>
                      <p className="text-xs font-bold truncate">{it.n}</p>
                      <div className="flex items-center justify-between mt-1"><span className="text-xs font-bold text-amber-500">{it.p}</span><span className="text-[9px] text-muted-foreground">{it.s}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollFloatWrapper>

            {/* Pro Profiles */}
            <ScrollFloatWrapper intensity={1}>
              <div className="h-full p-6 md:p-8 rounded-[2rem] bg-gradient-to-b from-background to-secondary/30 border border-border/50 shadow-xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><UserCheck className="w-24 h-24 text-pink-500" /></div>
                <div className="flex items-center gap-2 mb-6"><div className="h-8 w-8 rounded-full bg-pink-500/20 flex items-center justify-center"><UserCheck className="w-4 h-4 text-pink-500" /></div><h3 className="font-bold text-lg">Pro Profiles</h3></div>
                <div className="relative z-10">
                  <div className="rounded-2xl bg-secondary/50 border border-border/30 p-4 mb-3">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-lg font-bold text-white ring-4 ring-background">AO</div>
                      <div><div className="flex items-center gap-2"><p className="font-bold">Adebayo Ogunlesi</p><span className="text-[8px] font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">GOLD ★</span></div><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Lagos · React Developer</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">{[{l:'Gigs',v:'48'},{l:'Rating',v:'4.9★'},{l:'Earned',v:'₦1.2M'}].map(s=><div key={s.l} className="text-center p-2 rounded-lg bg-background/60"><p className="text-sm font-bold">{s.v}</p><p className="text-[9px] text-muted-foreground">{s.l}</p></div>)}</div>
                    <div className="flex gap-1.5 flex-wrap">{['React','TypeScript','Node.js','Figma'].map(s=><span key={s} className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 text-[10px] font-bold border border-pink-500/20">{s}</span>)}</div>
                  </div>
                  <div className="flex gap-2"><div className="flex-1 h-10 bg-brand rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-brand cursor-pointer">Hire Now</div><div className="h-10 px-4 rounded-xl border border-border/50 flex items-center justify-center text-xs font-medium cursor-pointer hover:bg-secondary/50">View Portfolio</div></div>
                </div>
              </div>
            </ScrollFloatWrapper>
          </div>
        </div>
      </section>

      <HowItWorks />
      <Categories />
      <TrustSection />
      <ImpactSection />
      <Footer />
    </main>
  );
};

export default Index;
