import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-maroon-dark text-white p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="text-gold text-7xl font-heading font-black opacity-20">404</div>
        <h1 className="text-4xl font-heading font-bold">Lost in the Archive</h1>
        <p className="text-cream/60 font-body text-lg">
          The collection you are looking for has been moved or no longer exists in our central repository.
        </p>
        <div className="pt-8">
          <a href="/" className="inline-flex h-12 px-8 items-center justify-center rounded-full bg-gold text-maroon-dark font-bold hover:bg-gold-light transition-all duration-300">
            Return to Command Center
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
