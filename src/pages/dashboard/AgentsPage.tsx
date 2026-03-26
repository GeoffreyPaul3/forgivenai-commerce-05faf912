import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Copy, DollarSign, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Agent = Tables<"agents">;

const AgentsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },
  });

  const createAgent = useMutation({
    mutationFn: async (agent: any) => {
      const { error } = await supabase.from("agents").insert(agent);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setShowAdd(false);
      toast({ title: "Agent registered!" });
    },
  });

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "FGV-";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const totalSales = agents?.reduce((s, a) => s + (a.total_sales || 0), 0) || 0;
  const totalCommission = agents?.reduce((s, a) => s + (a.total_commission || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Agents & Referrals</h2>
          <p className="text-muted-foreground text-sm font-body">{agents?.length || 0} registered agents</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Agent</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Agents", value: agents?.length || 0, icon: Users },
          { label: "Total Sales", value: `MWK ${totalSales.toLocaleString()}`, icon: TrendingUp },
          { label: "Commissions Paid", value: `MWK ${totalCommission.toLocaleString()}`, icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-body">{s.label}</span>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-heading font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Agent List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border animate-pulse bg-card" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents?.map(agent => (
            <div key={agent.id} className="rounded-xl border border-border bg-card p-5 hover:border-gold/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-heading font-semibold text-foreground">{agent.name}</h4>
                  <p className="text-xs text-muted-foreground font-body">{agent.phone || agent.email}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${agent.status === "active" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{agent.status}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <code className="px-2 py-1 rounded bg-muted text-sm font-mono text-foreground">{agent.referral_code}</code>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(agent.referral_code); toast({ title: "Code copied!" }); }}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Sales</p>
                  <p className="text-sm font-semibold">MWK {(agent.total_sales || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-sm font-semibold">MWK {(agent.total_commission || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-sm font-semibold">{agent.commission_rate}%</p>
                </div>
              </div>
            </div>
          ))}
          {(!agents || agents.length === 0) && (
            <div className="col-span-2 text-center py-12 text-muted-foreground font-body">
              <Users className="w-8 h-8 mx-auto mb-3" />
              No agents registered yet. Add your first sales agent.
            </div>
          )}
        </div>
      )}

      {/* Add Agent Dialog */}
      <Dialog open={showAdd} onOpenChange={v => !v && setShowAdd(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Register Agent</DialogTitle></DialogHeader>
          <AddAgentForm onSave={a => createAgent.mutate(a)} generateCode={generateCode} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function AddAgentForm({ onSave, generateCode }: { onSave: (a: any) => void; generateCode: () => string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", referral_code: generateCode(), commission_rate: "10" });
  return (
    <div className="space-y-3">
      <Input placeholder="Agent Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <div className="flex gap-2">
        <Input placeholder="Referral Code" value={form.referral_code} onChange={e => setForm(f => ({ ...f, referral_code: e.target.value }))} />
        <Button variant="outline" onClick={() => setForm(f => ({ ...f, referral_code: generateCode() }))}>Generate</Button>
      </div>
      <Input placeholder="Commission Rate (%)" type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} />
      <Button className="w-full" onClick={() => onSave({ ...form, commission_rate: parseFloat(form.commission_rate) || 10 })} disabled={!form.name || !form.referral_code}>Register Agent</Button>
    </div>
  );
}

export default AgentsPage;
