import { motion } from "framer-motion";
import { Play, Sparkles, TrendingUp } from "lucide-react";

const videos = [
  {
    id: 1,
    title: "Summer Collection",
    category: "Streetwear",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1020&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Evening Elegance",
    category: "Luxury",
    image: "https://images.unsplash.com/photo-1539109132381-3151b8a77ce3?q=80&w=986&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Urban Motion",
    category: "Activewear",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Minimalist Series",
    category: "Essentials",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2073&auto=format&fit=crop",
  }
];

const UGCShowcase = () => {
  return (
    <section id="ugc" className="py-32 bg-maroon-dark overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/20 bg-gold/5 text-gold text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="h-3 w-3" />
              UGC Studio
            </div>
            <h2 className="font-heading text-5xl md:text-6xl font-bold text-white mb-6">
              Cinematic <span className="text-gradient-gold">UGC</span>
            </h2>
            <p className="text-cream/60 text-lg font-body">
              Eliminate production overhead. Our fal.ai and Veo 3.1 powered studio 
              transforms product data into viral social content in seconds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-6"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-gold">8.4x</div>
              <div className="text-xs text-cream/40 uppercase tracking-widest mt-1">CTR Growth</div>
            </div>
            <div className="h-12 w-[1px] bg-gold/20" />
            <div className="text-center">
              <div className="text-4xl font-bold text-gold">fal.ai</div>
              <div className="text-xs text-cream/40 uppercase tracking-widest mt-1">Native Integration</div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((video, idx) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-charcoal"
            >
              <img 
                src={video.image} 
                alt={video.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-maroon-dark via-transparent to-transparent" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="h-16 w-16 rounded-full bg-gold/90 text-maroon-dark flex items-center justify-center backdrop-blur-sm -translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <Play className="h-8 w-8 fill-current" />
                </div>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-gold text-[10px] font-bold uppercase tracking-[0.2em]">
                  {video.category}
                </span>
                <h3 className="text-white font-heading text-xl font-bold mt-1">
                  {video.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UGCShowcase;
