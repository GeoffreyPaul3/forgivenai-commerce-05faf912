import { motion } from "framer-motion";
import { Handshake, TrendingUp } from "lucide-react";

export default function AgentBanner() {
  const brandName = "Tiyiphulira Limodzi";
  
  // Variants for staggered letter animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 150,
      },
    },
  };

  // Icon animation variants
  const iconVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8],
      rotate: [0, 15, -15, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Floating particles background logic (simulated with 5 premium elements)
  const particles = [
    { id: 1, size: 4, left: "15%", delay: 0, duration: 4 },
    { id: 2, size: 6, left: "45%", delay: 1, duration: 5 },
    { id: 3, size: 3, left: "75%", delay: 0.5, duration: 3.5 },
    { id: 4, size: 5, left: "85%", delay: 2, duration: 6 },
    { id: 5, size: 4, left: "30%", delay: 1.5, duration: 4.5 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ 
        scale: 1.01,
        borderColor: "rgba(212, 175, 55, 0.5)",
        boxShadow: "0 10px 30px -10px rgba(162, 29, 127, 0.3)"
      }}
      className="relative overflow-hidden rounded-3xl p-6 bg-maroon-gradient border border-gold/25 shadow-lg group select-none"
    >
      {/* Moving Shimmer Ribbon */}
      <motion.div
        className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 pointer-events-none"
        animate={{
          x: ["-100%", "100%"]
        }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: "linear"
        }}
      />

      {/* Floating Sparkle Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gold-light/40 pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: "-10px",
          }}
          animate={{
            y: ["0px", "-120px"],
            opacity: [0, 0.7, 0],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Background radial soft ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(212,175,55,0.08),transparent_50%)] pointer-events-none" />

      {/* Banner Content Layout */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Animated Mascot/Icon Box */}
          <motion.div
            variants={iconVariants}
            animate="animate"
            className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-light shrink-0 backdrop-blur-sm"
          >
            <Handshake className="w-6 h-6" />
          </motion.div>

          <div className="space-y-1">
            {/* Letter-by-letter Staggered Brand Message */}
            <motion.h3 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center font-heading text-2xl md:text-3xl font-extrabold tracking-wide text-gradient-gold"
            >
              {brandName.split(" ").map((word, wordIdx) => (
                <span key={wordIdx} className="inline-flex mr-3 last:mr-0">
                  {word.split("").map((letter, letterIdx) => (
                    <motion.span
                      key={letterIdx}
                      variants={letterVariants}
                      className="inline-block hover:text-white transition-colors duration-200 cursor-default"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
            </motion.h3>
            
            <p className="text-cream/70 font-body text-xs md:text-sm leading-relaxed max-w-xl">
              "Let's succeed together" — We grow as one. Track your growth, share your link, and maximize your rewards.
            </p>
          </div>
        </div>

        {/* Dynamic Badge */}
        <motion.div 
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-cream text-xs font-bold font-body transition-colors shrink-0 backdrop-blur-sm"
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          <TrendingUp className="w-4 h-4 text-gold-light" />
          <span>Together We Grow</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
