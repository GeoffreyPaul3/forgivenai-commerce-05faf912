import { useToast } from "./use-toast";

export const useLandingActions = () => {
  const { toast } = useToast();
  const WHATSAPP_NUMBER = "+265997128899"; // From Settings

  const openWhatsApp = (customMessage?: string) => {
    const refCode = localStorage.getItem("referral_code");
    let message = customMessage || "Hi Forgiven! I'm interested in the AI Commerce OS. ✨";
    
    if (refCode) {
      message += ` (Ref: ${refCode})`;
    }

    const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    
    if (refCode) {
      toast({
        title: "Referral Applied",
        description: `Your referral code ${refCode} has been included in the message.`,
      });
    }
  };

  return { openWhatsApp };
};
