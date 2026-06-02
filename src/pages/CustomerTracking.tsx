import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, Truck, CheckCircle, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CustomerTracking = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: trackingData, isLoading, error } = useQuery({
    queryKey: ['tracking', orderId],
    queryFn: async () => {
      // Fetch delivery order with events
      const { data, error } = await supabase
        .from('delivery_orders')
        .select(`
          *,
          delivery_tracking_events(status_name, description, event_time),
          orders(status, total)
        `)
        .eq('order_id', orderId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="font-body text-muted-foreground">Locating your parcel...</p>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Package className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-heading font-bold mb-2">Tracking Not Found</h2>
        <p className="font-body text-muted-foreground max-w-md">
          We couldn't find delivery details for this order. It might still be processing, or the ID is incorrect.
        </p>
      </div>
    );
  }

  const events = trackingData.delivery_tracking_events || [];
  events.sort((a, b) => new Date(b.event_time || 0).getTime() - new Date(a.event_time || 0).getTime());

  // Determine active step
  let step = 0;
  if (trackingData.parcel_status === 'parcel_created') step = 1;
  if (trackingData.parcel_status === 'in_transit') step = 2;
  if (trackingData.parcel_status === 'delivered') step = 3;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-heading font-bold text-foreground">Order Tracking</h1>
          <p className="text-muted-foreground font-body">Order #{orderId?.slice(0, 8).toUpperCase()}</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Delivery Status
              </CardTitle>
              <Badge variant={step === 3 ? "default" : "secondary"} className="uppercase">
                {trackingData.parcel_status?.replace('_', ' ') || 'Pending'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4 justify-between text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1 flex items-center gap-1"><MapPin className="w-4 h-4"/> Destination</p>
                <p className="font-bold">{trackingData.receiver_city}</p>
                <p className="text-muted-foreground">{trackingData.delivery_type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Waybill Number</p>
                <p className="font-bold">{trackingData.waybill_number || 'Awaiting Generation'}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Courier</p>
                <p className="font-bold">Smart Deliveries</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="relative pt-6 pb-2">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-in-out" 
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
              <div className="relative flex justify-between">
                {[
                  { label: "Processing", icon: Clock },
                  { label: "Parcel Created", icon: Package },
                  { label: "In Transit", icon: Truck },
                  { label: "Delivered", icon: CheckCircle }
                ].map((item, index) => {
                  const active = step >= index;
                  return (
                    <div key={index} className="flex flex-col items-center bg-card px-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 shadow-sm transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border border-border'}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No tracking events recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {events.map((ev, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      {i !== events.length - 1 && <div className="w-px h-12 bg-border my-1" />}
                    </div>
                    <div>
                      <p className="font-bold text-foreground uppercase">{ev.status_name.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">{ev.description || 'Status updated'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(ev.event_time || new Date()).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center pt-4">
          <Button variant="outline" onClick={() => window.location.href = '/shop'}>
            Continue Shopping
          </Button>
        </div>

      </div>
    </div>
  );
};

export default CustomerTracking;
