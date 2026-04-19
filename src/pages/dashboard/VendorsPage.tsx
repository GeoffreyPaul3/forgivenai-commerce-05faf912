import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Store, Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Star, MapPin, Phone, User } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VendorsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [viewVendor, setViewVendor] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vendorProducts } = useQuery({
    queryKey: ["vendor-products-count"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("vendor_id");
      return data || [];
    },
  });

  const createVendor = useMutation({
    mutationFn: async (vendor: any) => {
      const { error } = await supabase.from("vendors").insert(vendor);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setShowAdd(false);
      toast({ title: "Vendor created successfully!" });
    },
  });

  const updateVendor = useMutation({
    mutationFn: async (vendor: any) => {
      const { id, ...data } = vendor;
      const { error } = await supabase.from("vendors").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setEditVendor(null);
      toast({ title: "Vendor updated!" });
    },
  });

  const filteredVendors = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return vendors || [];
    return (vendors || []).filter(v =>
      [v.business_name, v.contact_person, v.phone, v.location, v.category].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [vendors, search]);

  const stats = useMemo(() => {
    const productCounts: Record<string, number> = {};
    vendorProducts?.forEach(p => {
      if (p.vendor_id) productCounts[p.vendor_id] = (productCounts[p.vendor_id] || 0) + 1;
    });
    return productCounts;
  }, [vendorProducts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Vendor Management</h2>
          <p className="text-muted-foreground text-sm font-body">{vendors?.length || 0} registered vendors</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Vendor
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Vendors", value: vendors?.length || 0, icon: Store, color: "text-primary" },
          { label: "Active Vendors", value: vendors?.filter(v => v.status === "active").length || 0, icon: Star, color: "text-gold" },
          { label: "Total Products", value: vendorProducts?.length || 0, icon: Plus, color: "text-blue-500" },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold font-heading">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="pl-9 bg-background" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Business Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-body">
                  <Store className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  No vendors found.
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map(vendor => (
                <TableRow key={vendor.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-heading font-semibold text-foreground">{vendor.business_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{vendor.contact_person}</p>
                      <p className="text-xs text-muted-foreground">{vendor.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{vendor.location || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="font-body text-[10px] uppercase font-bold">{vendor.category || "General"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{stats[vendor.id] || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gold font-bold">
                      <Star className="w-3 h-3 fill-gold" />
                      <span className="text-sm">{vendor.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={vendor.status === "active" ? "default" : "secondary"} className="capitalize text-[10px] font-bold">
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setViewVendor(vendor)}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditVendor(vendor)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vendor Forms */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading font-bold text-xl">Register New Vendor</DialogTitle></DialogHeader>
          <VendorForm onSave={data => createVendor.mutate(data)} onCancel={() => setShowAdd(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVendor} onOpenChange={v => !v && setEditVendor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading font-bold text-xl">Edit Vendor</DialogTitle></DialogHeader>
          {editVendor && <VendorForm vendor={editVendor} onSave={data => updateVendor.mutate({ id: editVendor.id, ...data })} onCancel={() => setEditVendor(null)} />}
        </DialogContent>
      </Dialog>

      {/* View Vendor Details */}
      <Dialog open={!!viewVendor} onOpenChange={v => !v && setViewVendor(null)}>
        <DialogContent className="max-w-md bg-card border-gold/10">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Store className="w-6 h-6" />
              </div>
              <DialogTitle className="font-heading font-bold text-2xl">{viewVendor?.business_name}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><User className="w-3 h-3" /><span className="text-[10px] uppercase font-bold tracking-wider">Contact Person</span></div>
                <p className="font-bold text-sm tracking-tight">{viewVendor?.contact_person}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Phone className="w-3 h-3" /><span className="text-[10px] uppercase font-bold tracking-wider">Phone</span></div>
                <p className="font-bold text-sm tracking-tight">{viewVendor?.phone}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 col-span-2">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><MapPin className="w-3 h-3" /><span className="text-[10px] uppercase font-bold tracking-wider">Location</span></div>
                <p className="font-bold text-sm tracking-tight">{viewVendor?.location || "Not specified"}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gold/5 border border-gold/10">
                <span className="text-sm font-semibold text-foreground/80 font-body">Vendor Score</span>
                <div className="flex items-center gap-1.5">
                   <Star className="w-4 h-4 fill-gold text-gold" />
                   <span className="text-xl font-heading font-black text-gold">{viewVendor?.score}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-3">Payment Details</p>
                <p className="text-sm font-medium leading-relaxed font-body">{viewVendor?.payment_details || "No payment information provided."}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function VendorForm({ vendor, onSave, onCancel }: { vendor?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    business_name: vendor?.business_name || "",
    contact_person: vendor?.contact_person || "",
    phone: vendor?.phone || "",
    location: vendor?.location || "",
    category: vendor?.category || "",
    payment_details: vendor?.payment_details || "",
    status: vendor?.status || "active",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name || !form.phone) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Business Name *</label>
        <Input placeholder="Forgiven Shoes Ltd" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} required className="font-body" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Contact Person</label>
          <Input placeholder="John Doe" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} className="font-body" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Phone *</label>
          <Input placeholder="+265..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required className="font-body" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Location</label>
        <Input placeholder="Blantyre, Malawi" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="font-body" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Category</label>
        <Input placeholder="Shoes / Apparel" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="font-body" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Payment Details</label>
        <Input placeholder="Bank Name, Account, etc." value={form.payment_details} onChange={e => setForm(f => ({ ...f, payment_details: e.target.value }))} className="font-body" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Status</label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="limited">Limited</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary text-white hover:bg-primary/90">Save Vendor</Button>
      </div>
    </form>
  );
}

export default VendorsPage;
