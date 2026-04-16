import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Shield, Save, Camera, Trash2, Upload } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const ProfilePage = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
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
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: form.full_name,
        phone: form.phone,
        location: form.location,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved!" });
    }
  };

  const initials = form.full_name
    ? form.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : form.email?.[0]?.toUpperCase() || "A";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Avatar + Header Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Maroon banner */}
        <div className="h-24 bg-maroon-gradient" />

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
                className="gap-1.5 text-xs"
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
                  className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>

          {/* Name & role */}
          <h2 className="font-heading text-xl font-bold text-foreground">
            {form.full_name || "Admin User"}
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-2">{form.email}</p>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: "hsl(var(--primary)/0.1)", color: "hsl(var(--primary))" }}
          >
            <Shield className="w-3 h-3" /> Administrator
          </span>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-heading text-base font-semibold text-foreground">Personal Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            <Input
              id="profile-full-name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <Input
              id="profile-email"
              value={form.email}
              disabled
              className="text-muted-foreground cursor-not-allowed"
              title="Email cannot be changed here"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </label>
            <Input
              id="profile-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+265 xxx xxx xxx"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </label>
            <Input
              id="profile-location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Blantyre, Malawi"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button id="profile-save-btn" onClick={handleSave} disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h3 className="font-heading text-base font-semibold text-foreground">Account Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">User ID</span>
            <span className="font-mono text-xs text-foreground truncate">{user?.id || "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Account Created</span>
            <span className="text-foreground">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Last Sign In</span>
            <span className="text-foreground">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Role</span>
            <span className="text-foreground">Administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
