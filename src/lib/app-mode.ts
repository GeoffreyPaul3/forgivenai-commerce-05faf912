
export type AppMode = "admin" | "vendor" | "agent";

export const getAppMode = (): AppMode => {
  if (typeof window === "undefined") return "admin";
  
  const hostname = window.location.hostname.toLowerCase();
  console.log("getAppMode: checking hostname =", hostname);
  
  if (hostname.includes("vendor")) {
    return "vendor";
  } else if (hostname.includes("agent")) {
    return "agent";
  }
  
  return "admin";
};

export const getRedirectUrl = (role: AppMode): string => {
  if (typeof window === "undefined") return "/dashboard";
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // Detect localhost (including subdomains like agents.localhost)
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
  
  if (isLocalhost) {
    const portSuffix = port ? `:${port}` : "";
    if (role === "vendor") return `${protocol}//vendors.localhost${portSuffix}/dashboard`;
    if (role === "agent") return `${protocol}//agents.localhost${portSuffix}/dashboard`;
    return `${protocol}//localhost${portSuffix}/dashboard`;
  }

  // Production URLs
  if (role === "vendor") return `${protocol}//vendors.forgivensc.com/dashboard`;
  if (role === "agent") return `${protocol}//agents.forgivensc.com/dashboard`;
  return `${protocol}//forgivensc.com/dashboard`;
};
