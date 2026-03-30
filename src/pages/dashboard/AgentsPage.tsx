import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Copy, DollarSign, TrendingUp, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Agent = Tables<"agents">;
const PAGE_SIZE = 8;

const AgentsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  const filteredAgents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return agents || [];
    return (agents || []).filter((agent) =>
      [agent.name, agent.phone, agent.email, agent.referral_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [agents, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const paginatedAgents = filteredAgents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* Agent Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents by name, phone, email, or referral code"
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Agent</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Total Commission</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-body">
                  <Users className="w-8 h-8 mx-auto mb-3" />
                  No agents found. Add a new agent or adjust your search.
                </TableCell>
              </TableRow>
            ) : (
              paginatedAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div>
                      <p className="font-heading font-semibold text-foreground">{agent.name}</p>
                      <p className="text-xs text-muted-foreground font-body">{agent.phone || agent.email || "No contact"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1">
                      <code className="text-sm font-mono text-foreground">{agent.referral_code}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(agent.referral_code);
                          toast({ title: "Code copied!" });
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{agent.commission_rate || 0}%</TableCell>
                  <TableCell>MWK {(agent.total_sales || 0).toLocaleString()}</TableCell>
                  <TableCell>MWK {(agent.total_commission || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"} className="capitalize">
                      {agent.status || "inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((current) => Math.max(1, current - 1));
                }}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(p);
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((current) => Math.min(totalPages, current + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
