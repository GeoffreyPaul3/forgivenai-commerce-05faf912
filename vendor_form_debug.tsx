function VendorForm({ vendor, onSave, onCancel, isLoading }: { vendor?: any; onSave: (data: any) => void; onCancel: () => void; isLoading?: boolean }) {
  const initialPayout = useMemo(() => {
    try {
      return JSON.parse(vendor?.payment_details || '{"type":"bank"}');
    } catch {
      return { type: 'bank', bank_name: '', account_number: '', branch_name: '', account_holder: '' };
    }
  }, [vendor]);

  const [form, setForm] = useState({
    business_name: vendor?.business_name || "",
    contact_person: vendor?.contact_person || "",
    phone: vendor?.phone || "",
    address: vendor?.address || "",
    category: vendor?.category || "",
    status: vendor?.status || "active",
    email: "",
    password: "",
  });

  const [payout, setPayout] = useState(initialPayout);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name || !form.phone) return;
    if (!vendor && (!form.email || !form.password)) {
      toast({ variant: "destructive", title: "Missing Credentials", description: "Email and password are required for new vendors." });
      return;
    }
    onSave({
      ...form,
      payment_details: JSON.stringify(payout)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Identity & Logistics */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Identity & Logistics</label>
            <div className="space-y-4">
              {!vendor && (
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 mb-2">
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Login Credentials</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Login Email *</label>
                        <Input 
                          type="email"
                          placeholder="vendor@example.com" 
                          value={form.email} 
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                          required 
                          className="font-body h-11 rounded-xl bg-background border-primary/20" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Temp Password *</label>
                        <Input 
                          type="text"
                          placeholder="Set password" 
                          value={form.password} 
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                          required 
                          className="font-body h-11 rounded-xl bg-background border-primary/20" 
                        />
                      </div>
                   </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Business Name *</label>
                <Input 
                  placeholder="e.g. Forgiven Shoes Ltd" 
                  value={form.business_name} 
                  onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} 
                  required 
                  className="font-body h-11 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Contact Name</label>
                  <Input 
                    placeholder="John Doe" 
                    value={form.contact_person} 
                    onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} 
                    className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Phone Number *</label>
                  <Input 
                    placeholder="+265..." 
                    value={form.phone} 
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                    required 
                    className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Warehouse Address</label>
                <Input 
                  placeholder="Blantyre, Malawi" 
                  value={form.address} 
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                  className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Business Category</label>
                  <Input 
                    placeholder="Shoes / Apparel" 
                    value={form.category} 
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
                    className="font-body h-11 rounded-xl bg-muted/20 border-border/50" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Partnership Status</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="font-body h-11 rounded-xl bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payout Configuration */}
        <div className="space-y-5">
          <div className="p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 shadow-sm space-y-5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest inline-flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" /> Payout Configuration
              </label>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
                <Button 
                  type="button" 
                  variant={payout.type === 'bank' ? 'default' : 'ghost'} 
                  onClick={() => setPayout(p => ({ ...p, type: 'bank' }))}
                  className="h-7 text-[10px] font-black rounded-lg px-3"
                >BANK</Button>
                <Button 
                  type="button" 
                  variant={payout.type === 'mobile' ? 'default' : 'ghost'} 
                  onClick={() => setPayout(p => ({ ...p, type: 'mobile' }))}
                  className="h-7 text-[10px] font-black rounded-lg px-3"
                >MOBILE</Button>
              </div>
            </div>

            {payout.type === 'bank' ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Bank Name</label>
                  <Input 
                    placeholder="e.g. Standard Bank" 
                    value={payout.bank_name || ""} 
                    onChange={e => setPayout(p => ({ ...p, bank_name: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase">Account Number</label>
                    <Input 
                      placeholder="012..." 
                      value={payout.account_number || ""} 
                      onChange={e => setPayout(p => ({ ...p, account_number: e.target.value }))}
                      className="h-10 rounded-xl bg-background border-emerald-500/20 font-mono font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase">Branch Name</label>
                    <Input 
                      placeholder="Blantyre" 
                      value={payout.branch_name || ""} 
                      onChange={e => setPayout(p => ({ ...p, branch_name: e.target.value }))}
                      className="h-10 rounded-xl bg-background border-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Account Holder Name</label>
                  <Input 
                    placeholder="Business or Personal Name" 
                    value={payout.account_holder || ""} 
                    onChange={e => setPayout(p => ({ ...p, account_holder: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Mobile Money Provider</label>
                  <Select value={payout.provider} onValueChange={v => setPayout(p => ({ ...p, provider: v }))}>
                    <SelectTrigger className="h-10 rounded-xl bg-background border-emerald-500/20"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="airtel">Airtel Money</SelectItem>
                      <SelectItem value="mpamba">TNM Mpamba</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Mobile Number</label>
                  <Input 
                    placeholder="099..." 
                    value={payout.phone_number || ""} 
                    onChange={e => setPayout(p => ({ ...p, phone_number: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20 font-mono font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase">Registered Account Name</label>
                  <Input 
                    placeholder="Full Registered Name" 
                    value={payout.account_name || ""} 
                    onChange={e => setPayout(p => ({ ...p, account_name: e.target.value }))}
                    className="h-10 rounded-xl bg-background border-emerald-500/20"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-emerald-500/10 p-4 rounded-2xl flex gap-3 items-start border border-emerald-500/20 shadow-inner">
               <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
               <p className="text-[10px] text-emerald-700/80 leading-relaxed font-bold">
                 PAYOUT SECURITY: These details are used for automated disbursement of vendor funds.
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-border/50">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 h-12 rounded-2xl font-bold hover:bg-muted/50">Cancel</Button>
        <Button type="submit" disabled={isLoading} className="flex-[2] bg-primary text-white hover:bg-primary/90 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : null}
          {vendor ? "Update Vendor Profile" : "Activate New Vendor Partnership"}
        </Button>
      </div>
    </form>
  );
}

export default VendorsPage;
