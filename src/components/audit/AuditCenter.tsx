import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/services/audit/auditService";
import { FileText, ShieldCheck, Search, Filter, Terminal } from "lucide-react";
import { Input } from "@/components/ui/input";

export const AuditCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["immutable-audit-logs"],
    queryFn: () => fetchAuditLogs(100),
    refetchInterval: 30000,
  });

  const filteredLogs = logs.filter(
    (l) =>
      l.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.actor_position && l.actor_position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">Immutable Audit Engine</h3>
            <p className="text-xs text-muted-foreground font-body">
              Cryptographically verified enterprise event log & state diffs
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground font-body">Loading audit logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground font-body">
          No audit logs matching search term.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Module & Action</th>
                <th className="px-4 py-3">Reason / Details</th>
                <th className="px-4 py-3 text-right">Device / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors font-body">
                  <td className="px-4 py-3 text-muted-foreground shrink-0 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-primary/10 text-primary">
                      {log.actor_position || "Executive Admin"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{log.module}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{log.action}</p>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className="text-foreground text-xs">{log.reason || "Enterprise action executed"}</p>
                    {log.new_value && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                        Diff: {JSON.stringify(log.new_value)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-muted-foreground font-mono">
                    {log.ip_address || "127.0.0.1"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
