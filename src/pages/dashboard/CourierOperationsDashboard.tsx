import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, RefreshCw, MoreHorizontal, CreditCard, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { syncParcelStatus } from "@/integrations/smart-deliveries/smartDeliveriesService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CourierOperationsDashboard = () => {
  const { data: deliveries, isLoading, refetch } = useQuery({
    queryKey: ['delivery_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_orders')
        .select(`
          *,
          courier_providers(name),
          orders(status, total),
          delivery_service_payments(status, transaction_reference)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleSync = async () => {
    try {
      toast.info("Syncing tracking events...");
      const res = await syncParcelStatus();
      if (res.synced > 0) {
        toast.success(`Successfully synced ${res.synced} deliveries!`);
        refetch();
      } else {
        toast.info("All deliveries are up to date.");
      }
    } catch (e: any) {
      toast.error("Failed to sync: " + e.message);
    }
  };

  const handleRetryDispatch = async (deliveryOrderId: string) => {
    try {
      toast.loading("Retrying dispatch to Smart Deliveries...", { id: `dispatch-${deliveryOrderId}` });
      
      const { data, error } = await supabase.functions.invoke('smart-deliveries-create-parcel', {
        body: { deliveryOrderId }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Dispatch successful! Waybill generated.", { id: `dispatch-${deliveryOrderId}` });
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(`Dispatch failed: ${e.message}`, { id: `dispatch-${deliveryOrderId}` });
    }
  };

  const handlePayout = async (deliveryOrderId: string) => {
    try {
      toast.loading("Initiating PayChangu payout...", { id: `payout-${deliveryOrderId}` });
      
      const { data, error } = await supabase.functions.invoke('paychangu-payout', {
        body: { deliveryOrderId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Unknown error");

      toast.success("Payout successful!", { id: `payout-${deliveryOrderId}` });
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(`Payout failed: ${e.message}`, { id: `payout-${deliveryOrderId}` });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading courier operations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading">Courier Operations</h2>
          <p className="text-muted-foreground">Manage and track Smart Deliveries.</p>
        </div>
        <Button onClick={handleSync} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Sync All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-body">Active Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-heading text-primary flex items-center gap-2">
              <Truck className="w-6 h-6" /> 
              {deliveries?.filter(d => !['delivered', 'returned'].includes(d.parcel_status || '')).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-body">Total Dispatched</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-heading text-primary flex items-center gap-2">
              <Package className="w-6 h-6" /> 
              {deliveries?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Receiver</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Waybill</TableHead>
              <TableHead>Fee (MWK)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries?.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.order_id.slice(0, 8)}</TableCell>
                <TableCell>
                  <p className="font-medium">{d.receiver_name}</p>
                  <p className="text-xs text-muted-foreground">{d.receiver_phone}</p>
                </TableCell>
                <TableCell>{d.receiver_city}</TableCell>
                <TableCell className="font-mono text-xs">{d.waybill_number || 'N/A'}</TableCell>
                <TableCell>{d.delivery_fee?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={d.parcel_status === 'delivered' ? 'default' : 'secondary'}>
                    {d.parcel_status?.replace('_', ' ') || 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => window.open(`/tracking/${d.order_id}`, '_blank')}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Tracking
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {d.parcel_status === 'pending' && d.orders?.status === 'paid' && (
                        <DropdownMenuItem onClick={() => handleRetryDispatch(d.id)} className="text-blue-600 focus:text-blue-600 font-medium">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Dispatch
                        </DropdownMenuItem>
                      )}
                      {d.delivery_service_payments && d.delivery_service_payments.length > 0 && d.delivery_service_payments.some((p: any) => p.status === 'paid') ? (
                        <DropdownMenuItem disabled>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-auto">
                            Paid
                          </Badge>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handlePayout(d.id)} className="text-purple-600 focus:text-purple-600 font-medium">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pay via PayChangu
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {deliveries?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No delivery orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CourierOperationsDashboard;
