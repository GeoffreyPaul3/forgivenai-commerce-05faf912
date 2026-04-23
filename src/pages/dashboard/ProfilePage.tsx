import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Shield, Save, Camera, Trash2, Upload, Store, Briefcase } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const ProfilePage = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
  });

  const [businessForm, setBusinessForm] = useState({
    business_name: "",
    phone: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        setForm({
          full_name: data.user.user_metadata?.full_name || "",
          email: data.user.email || "",
          phone: data.user.user_metadata?.phone || "",
          location: data.user.user_metadata?.location || "",
        });
        const existingAvatar = data.user.user_metadata?.avatar_url;
        if (existingAvatar) setAvatarUrl(existingAvatar);

        // Fetch role from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        
        setRole(profile?.role ?? null);

        // If vendor, fetch vendor business details
        if (profile?.role === "vendor") {
          const { data: vendor } = await supabase
            .from("vendors")
            .select("*")
            .eq("user_id", data.user.id)
            .maybeSingle();
          
          if (vendor) {
            setVendorProfile(vendor);
            setBusinessForm({
              business_name: vendor.business_name || "",
              phone: vendor.phone || "",
            });
          }
        }
      }
    });
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Avatar must be under 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      // Bust cache with timestamp
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Save URL to user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: "Avatar updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAvatarDelete = async () => {
    if (!user || !avatarUrl) return;
    setUploading(true);
    try {
      // Remove all known extensions
      const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
      await Promise.all(
        extensions.map((ext) =>
          supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`])
        )
      );
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      setAvatarUrl(null);
      toast({ title: "Avatar removed." });
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    // 1. Update Auth Metadata (Personal)
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: form.full_name,
        phone: form.phone,
        location: form.location,
        business_name: businessForm.business_name, // Sync business name to metadata too
      },
    });

    if (authError) {
      setLoading(false);
      toast({ title: "Error saving personal info", description: authError.message, variant: "destructive" });
      return;
    }

    // 2. Update Vendor Table (Business) if role is vendor
    if (role === "vendor" && vendorProfile) {
      const { error: vendorError } = await supabase
        .from("vendors")
        .update({
          business_name: businessForm.business_name,
          phone: businessForm.phone,
        })
        .eq("id", vendorProfile.id);
      
      if (vendorError) {
        setLoading(false);
        toast({ title: "Error saving business info", description: vendorError.message, variant: "destructive" });
        return;
      }
    }

    setLoading(false);
    toast({ title: "Profile saved!" });
  };

  const initials = form.full_name
    ? form.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : form.email?.[0]?.toUpperCase() || "A";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Avatar + Header Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Maroon/Gold banner */}
        <div className="h-24 bg-gradient-to-r from-maroon to-maroon-dark flex items-center justify-end px-6">
          <Badge className="bg-gold/20 text-gold border-gold/30 hover:bg-gold/30 cursor-default">
            {role === "admin" ? "System Administrator" : role === "vendor" ? "Business Partner" : role === "agent" ? "Sales Partner" : "Member"}
          </Badge>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end gap-4 -mt-10 mb-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-card shadow-lg"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl border-4 border-card shadow-lg flex items-center justify-center font-heading font-bold text-2xl"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  {initials}
                </div>
              )}
              {/* Upload button */}
              <button
                id="profile-upload-avatar-btn"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full border-2 border-card flex items-center justify-center transition-transform hover:scale-110 disabled:opacity-50"
                style={{ background: "hsl(var(--gold))", color: "hsl(var(--foreground))" }}
                title="Upload avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pb-1">
              <Button
                id="profile-change-avatar-btn"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-1.5 text-xs rounded-xl"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
              {avatarUrl && (
                <Button
                  id="profile-delete-avatar-btn"
                  size="sm"
                  variant="outline"
                  onClick={handleAvatarDelete}
                  disabled={uploading}
                  className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>

          {/* Name & role */}
          <h2 className="font-heading text-2xl font-bold text-foreground">
            {form.full_name || "Profile"}
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-2">{form.email}</p>
        </div>
      </div>

      {/* Business Information (VENDORS ONLY) */}
      {role === "vendor" && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-500">
            <Store className="w-5 h-5" />
            <h3 className="font-heading text-base font-bold">Business Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Business Name
              </label>
              <Input
                id="profile-business-name"
                value={businessForm.business_name}
                onChange={(e) => setBusinessForm((f) => ({ ...f, business_name: e.target.value }))}
                placeholder="Business name"
                className="rounded-xl border-border/50 bg-muted/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Business Phone
              </label>
              <Input
                id="profile-business-phone"
                value={businessForm.phone}
                onChange={(e) => setBusinessForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Business phone"
                className="rounded-xl border-border/50 bg-muted/20"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-body bg-orange-500/5 p-2 rounded-lg border border-orange-500/10">
            These details appear on your invoices and are visible to customers who purchase your products.
          </p>
        </div>
      )}

      {/* Personal Information */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <User className="w-5 h-5" />
          <h3 className="font-heading text-base font-bold">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Full Name
            </label>
            <Input
              id="profile-full-name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
              className="rounded-xl border-border/50 bg-muted/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Email Address
            </label>
            <Input
              id="profile-email"
              value={form.email}
              disabled
              className="text-muted-foreground cursor-not-allowed rounded-xl border-border/50 bg-muted/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Phone Number
            </label>
            <Input
              id="profile-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+265 xxx xxx xxx"
              className="rounded-xl border-border/50 bg-muted/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Location
            </label>
            <Input
              id="profile-location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Blantyre, Malawi"
              className="rounded-xl border-border/50 bg-muted/20"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button 
            id="profile-save-btn" 
            onClick={handleSave} 
            disabled={loading} 
            className="gap-2 rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving Changes..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm opacity-80">
        <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4" /> Account Security
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">User ID</span>
            <span className="font-mono text-xs text-foreground truncate">{user?.id || "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Role</span>
            <span className="text-foreground capitalize font-semibold">
              {role === "admin" ? "Administrator" : role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Member Since</span>
            <span className="text-foreground">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Last Sign In</span>
            <span className="text-foreground">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

export default ProfilePage;

