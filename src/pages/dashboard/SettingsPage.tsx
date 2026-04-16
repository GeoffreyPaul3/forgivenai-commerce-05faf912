import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, RefreshCw, Loader2, Store, Globe, Phone, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SettingsPage = () => {
  const { toast } = useToast();
  const [crawlUrl, setCrawlUrl] = useState("https://www.forgivenshoppingcentre.com/");
  const [crawling, setCrawling] = useState(false);
  const [brandForm, setBrandForm] = useState({
    name: "Forgiven Shopping Centre",
    currency: "MWK",
    whatsapp: "+265997128899",
    website: "https://www.forgivenshoppingcentre.com",
  });

  const handleCrawl = async () => {
    if (!crawlUrl) return;
    setCrawling(true);
    toast({ title: "Crawl initiated", description: "This may take a minute as we discover and extract product data..." });

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-products", {
        body: { action: "sync", url: crawlUrl, limit: 10 }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Sync failed");

      toast({ 
        title: "Crawl complete", 
        description: `Successfully imported/updated ${data.imported} products from your website.` 
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      toast({ 
        title: "Sync failed", 
        description: err.message || "An unexpected error occurred during sync.", 
        variant: "destructive" 
      });
    } finally {
      setCrawling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm font-body">Manage your store configuration</p>
      </div>

      {/* Website Sync */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-gold" /> Website Data Sync
        </h3>
        <p className="text-sm text-muted-foreground font-body">Re-crawl your website to refresh product data in the knowledge base.</p>
        <div className="flex gap-2">
          <Input value={crawlUrl} onChange={e => setCrawlUrl(e.target.value)} className="flex-1" />
          <Button onClick={handleCrawl} disabled={crawling} className="gap-2">
            {crawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Now
          </Button>
        </div>
      </div>

      {/* Brand Settings */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Store className="w-5 h-5 text-gold" /> Brand Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
              <Store className="w-3 h-3" /> Brand Name
            </label>
            <Input value={brandForm.name} onChange={e => setBrandForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
              <Banknote className="w-3 h-3" /> Currency
            </label>
            <Input value={brandForm.currency} onChange={e => setBrandForm(f => ({ ...f, currency: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> WhatsApp Number
            </label>
            <Input value={brandForm.whatsapp} onChange={e => setBrandForm(f => ({ ...f, whatsapp: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Website
            </label>
            <Input value={brandForm.website} onChange={e => setBrandForm(f => ({ ...f, website: e.target.value }))} />
          </div>
        </div>
        <Button onClick={() => toast({ title: "Settings saved" })}>Save Settings</Button>
      </div>

      {/* AI Configuration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-gold" /> AI Configuration
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-sm font-semibold font-heading">Content Generation</p>
              <p className="text-xs text-muted-foreground">AI-powered product descriptions, social posts & campaigns</p>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full font-semibold">Active</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-sm font-semibold font-heading">UGC Video Generation</p>
              <p className="text-xs text-muted-foreground">AI avatars & video creation with fal.ai</p>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full font-semibold">Active</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-sm font-semibold font-heading">Business Assistant</p>
              <p className="text-xs text-muted-foreground">AI-powered business insights & recommendations</p>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Phone className="w-5 h-5 text-gold" /> Notification Preferences
        </h3>
        <div className="space-y-3">
          {["New order alerts", "Low stock warnings", "AI content ready", "Payment confirmations"].map(item => (
            <div key={item} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm font-body">{item}</span>
              <span className="text-xs text-muted-foreground">WhatsApp</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
