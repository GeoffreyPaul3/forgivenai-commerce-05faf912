
export type AppMode = "admin" | "vendor" | "agent";

export const getAppMode = (): AppMode => {
  if (typeof window === "undefined") return "admin";
  
  const hostname = window.location.hostname;
  
  if (hostname.includes("vendors.") || hostname.includes("vendors-")) {
    return "vendor";
  } else if (hostname.includes("agents.") || hostname.includes("agents-")) {
    return "agent";
  }
  
  return "admin";
};
