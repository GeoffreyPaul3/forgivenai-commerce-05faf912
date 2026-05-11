import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, Video, Link as LinkIcon, 
  Download, Play, ExternalLink, 
  BookOpen, Lightbulb, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";

export default function AgentTrainingPage() {
  const { data: materials, isLoading } = useQuery({
    queryKey: ["training-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_materials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Default fallback materials (Stage 3 Essentials)
  const defaultMaterials = [
    {
      id: "1",
      title: "How the Business Works",
      description: "Core principles of Forgiven Shopping Centre and your role as an agent.",
      type: "pdf",
      url: "#",
      category: "Onboarding"
    },
    {
      id: "2",
      title: "How Links & Tracking Work",
      description: "Detailed guide on using your referral links and ensuring orders are attributed to you.",
      type: "video",
      url: "#",
      category: "Technical"
    },
    {
      id: "3",
      title: "Sales Scripts & Follow-ups",
      description: "Sample messages for WhatsApp and Facebook to help you close sales.",
      type: "pdf",
      url: "#",
      category: "Sales"
    },
    {
      id: "4",
      title: "Objection Handling Guide",
      description: "How to handle common customer questions about delivery, price, and quality.",
      type: "pdf",
      url: "#",
      category: "Sales"
    }
  ];

  const displayMaterials = (materials && materials.length > 0) ? materials : defaultMaterials;

  const iconMap: Record<string, any> = {
    pdf: FileText,
    video: Video,
    link: LinkIcon
  };

  const colorMap: Record<string, string> = {
    pdf: "text-blue-500 bg-blue-500/10",
    video: "text-red-500 bg-red-500/10",
    link: "text-emerald-500 bg-emerald-500/10"
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            Training & Enablement
          </h2>
          <p className="text-muted-foreground font-body mt-1">
            Master the art of selling and understand the Forgiven ecosystem. (Stage 3)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">Stage 3 Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayMaterials.map((item, i) => {
          const Icon = iconMap[item.type] || FileText;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full rounded-3xl border-border bg-card hover:shadow-xl transition-all group overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl ${colorMap[item.type] || "bg-muted"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {(item as any).category && (
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                        {(item as any).category}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="font-heading text-lg group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="font-body text-sm line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full gap-2 rounded-xl font-bold" 
                    variant={item.type === "video" ? "default" : "outline"}
                    onClick={() => window.open(item.url, "_blank")}
                  >
                    {item.type === "video" ? (
                      <>
                        <Play className="w-4 h-4" /> Watch Video
                      </>
                    ) : item.type === "pdf" ? (
                      <>
                        <Download className="w-4 h-4" /> Download PDF
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" /> Visit Link
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
        <Card className="rounded-3xl border-primary/20 bg-primary/5 p-6 border-dashed">
          <div className="flex gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold">Quick Selling Tip</h3>
              <p className="text-sm text-muted-foreground font-body mt-1">
                "Use the Promotion Kit to share UGC videos on your WhatsApp Status. Real customer reactions drive 3x more clicks than simple product images."
              </p>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-border bg-card p-6">
          <div className="flex gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold">Support Community</h3>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Join our exclusive Agent WhatsApp group to share tips with top performers and get daily content updates.
              </p>
              <Button variant="link" className="p-0 h-auto text-emerald-600 mt-2 font-bold">
                Join Community →
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
