import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, UserPlus, Trash2, CheckCircle2, User, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const StaffPositionsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Fetch all staff positions
  const { data: positions = [] } = useQuery({
    queryKey: ["all-staff-positions"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_positions").select("*").order("name");
      return data || [];
    },
  });

  // Fetch all admin/staff profiles
  const { data: staffUsers = [] } = useQuery({
    queryKey: ["all-admin-staff-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("role", "admin");
      return data || [];
    },
  });

  // Fetch current user position assignments
  const { data: userPositions = [], isLoading } = useQuery({
    queryKey: ["all-user-positions-assignments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_positions")
        .select("user_id, position_id, assigned_at, staff_positions(name, code), profiles:user_id(full_name, email)");
      return data || [];
    },
  });

  const handleAssign = async () => {
    if (!selectedUserId || !selectedPositionId) {
      toast.error("Please select both a staff member and an enterprise position.");
      return;
    }

    setAssigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("user_positions").upsert(
        [
          {
            user_id: selectedUserId,
            position_id: selectedPositionId,
            assigned_by: user?.id,
          },
        ],
        { onConflict: "user_id,position_id" }
      );

      if (error) {
        toast.error("Failed to assign staff position: " + error.message);
      } else {
        toast.success("Enterprise position assigned successfully!");
        setSelectedUserId("");
        setSelectedPositionId("");
        queryClient.invalidateQueries({ queryKey: ["all-user-positions-assignments"] });
        queryClient.invalidateQueries({ queryKey: ["enterprise-rbac-context"] });
      }
    } catch (err) {
      toast.error("An error occurred during assignment.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string, positionId: string) => {
    try {
      const { error } = await supabase
        .from("user_positions")
        .delete()
        .eq("user_id", userId)
        .eq("position_id", positionId);

      if (error) {
        toast.error("Failed to remove position: " + error.message);
      } else {
        toast.success("Position assignment removed.");
        queryClient.invalidateQueries({ queryKey: ["all-user-positions-assignments"] });
        queryClient.invalidateQueries({ queryKey: ["enterprise-rbac-context"] });
      }
    } catch (err) {
      toast.error("An error occurred.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">Enterprise Staff Positions & RBAC</h3>
          <p className="text-xs text-muted-foreground font-body">
            Assign organization positions to Admin staff members to authorize workspace access and permission tiers.
          </p>
        </div>
      </div>

      {/* Position Assignment Form */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h4 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Assign Enterprise Staff Position
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground font-body">Admin User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select staff member..." />
              </SelectTrigger>
              <SelectContent>
                {staffUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground font-body">Enterprise Position</label>
            <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select position..." />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p: any) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleAssign}
              disabled={assigning || !selectedUserId || !selectedPositionId}
              className="w-full text-xs font-bold gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Assign Position
            </Button>
          </div>
        </div>
      </div>

      {/* Active Position Assignments List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden p-5 space-y-4">
        <h4 className="font-heading text-sm font-bold text-foreground">Active Staff Positions</h4>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading position assignments...</div>
        ) : userPositions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-body">
            No custom position assignments yet. Unassigned Admins automatically inherit <strong>Managing Director</strong> access.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {userPositions.map((up: any) => (
              <div key={`${up.user_id}-${up.position_id}`} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-heading font-bold text-xs text-foreground">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground font-body">
                      {up.profiles?.full_name || up.profiles?.email || "Admin User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-body">{up.profiles?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {up.staff_positions?.name || "Staff Position"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(up.user_id, up.position_id)}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default StaffPositionsManagement;
