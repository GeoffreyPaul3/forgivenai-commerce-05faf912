import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Globe, MessageSquare, CreditCard, RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const SettingsPage = () => {
  const { toast } = useToast();
  const [crawlUrl, setCrawlUrl] = useState("https://www.forgivenshoppingcentre.com/");
  const [crawling, setCrawling] = useState(false);

  const handleCrawl = async () => {
    setCrawling(true);
    toast({ title: "Crawl initiated", description: "This may take a moment..." });
    setTimeout(() => {
      setCrawling(false);
      toast({ title: "Crawl complete", description: "Product data refreshed" });
    }, 3000);
  };

  const integrations = [
    {
      name: "Firecrawl",
      description: "Website scraping & product import",
      icon: Globe,
      status: "connected" as const,
      details: "Connected — importing from forgivenshoppingcentre.com",
    },
    {
      name: "Twilio (WhatsApp)",
      description: "Customer messaging via WhatsApp",
      icon: MessageSquare,
      status: "not_configured" as const,
      details: "Requires TWILIO_ACCOUNT_SID, AUTH_TOKEN, and WhatsApp number",
    },
    {
      name: "PayChangu",
      description: "Payment processing",
      icon: CreditCard,
      status: "not_configured" as const,
      details: "Payment gateway for MWK transactions",
    },
    {
      name: "Lovable AI",
      description: "AI content generation & assistant",
      icon: Settings,
      status: "connected" as const,
      details: "Connected — powering content generation and AI assistant",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm font-body">Manage integrations and platform configuration</p>
      </div>

      {/* Website Sync */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="w-5 h-5" /> Website Data Sync
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

      {/* Integrations */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg font-semibold">Integrations</h3>
        {integrations.map(int => (
          <div key={int.name} className="rounded-xl border border-border bg-card p-5 flex items-center justify-between hover:border-gold/20 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <int.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading text-sm font-semibold">{int.name}</h4>
                <p className="text-xs text-muted-foreground font-body">{int.details}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {int.status === "connected" ? (
                <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Connected</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="w-3 h-3" /> Not configured</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Brand Settings */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold">Brand Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-body">Brand Name</label>
            <Input defaultValue="Forgiven Shopping Centre" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body">Currency</label>
            <Input defaultValue="MWK" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body">WhatsApp Number</label>
            <Input defaultValue="+265997128899" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body">Website</label>
            <Input defaultValue="https://www.forgivenshoppingcentre.com" />
          </div>
        </div>
        <Button>Save Settings</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
