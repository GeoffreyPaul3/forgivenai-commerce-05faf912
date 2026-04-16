import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Users, ExternalLink, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

const PAGE_SIZE = 10;

const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`*, first_agent:agents(name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (customers || []).filter(c => 
    [c.name, c.phone, c.email].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: "Total Customers", value: (customers || []).length, icon: Users, color: "text-blue-600" },
    { label: "Returning Customers", value: (customers || []).filter(c => c.customer_status !== 'new').length, icon: ShoppingBag, color: "text-emerald-600" },
    { label: "High Value", value: (customers || []).filter(c => c.customer_status === 'high_value').length, icon: TrendingUp, color: "text-gold" },
    { label: "Total Revenue", value: `MWK ${(customers || []).reduce((s, c) => s + (c.total_spent || 0), 0).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Customer Directory</h2>
          <p className="text-muted-foreground text-sm font-body">Manage platform-owned customer relationships</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-body">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email..." className="pl-9" />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>First Agent</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>)}</TableRow>
            )) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No customers found.</TableCell></TableRow>
            ) : paginated.map(customer => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div>
                    <p className="font-heading font-semibold text-foreground">{customer.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground font-body">{customer.phone} {customer.email && `• ${customer.email}`}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={customer.customer_status === 'high_value' ? 'default' : 'secondary'} className="capitalize text-xs">
                    {customer.customer_status || 'new'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-body">
                  {customer.first_agent?.name || <span className="text-muted-foreground">Direct</span>}
                </TableCell>
                <TableCell className="font-semibold">{customer.total_orders}</TableCell>
                <TableCell className="font-semibold text-primary">MWK {customer.total_spent?.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(customer.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination><PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={e => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <PaginationItem key={p}><PaginationLink href="#" isActive={p === page} onClick={e => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink></PaginationItem>
          ))}
          <PaginationItem><PaginationNext href="#" onClick={e => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} /></PaginationItem>
        </PaginationContent></Pagination>
      )}
    </div>
  );
};

export default CustomersPage;
