import { supabase } from "@/integrations/supabase/client";
import { validateCity, validateReceiverName, validateReceiverPhone } from "./validationEngine";

export interface PackageItem {
  name: string;
  qty: number;
  valuedAt: number;
  pictures: string[]; // EXACTLY 3 images required
}

export interface ParcelPayload {
  receiverName: string;
  receiverPhone: string;
  receiverLocation: string; // Lilongwe, Blantyre, Mzuzu, Zomba
  receiverLocationDescription?: string;
  deliveryType: 'door_to_door' | 'office_collection';
  packages: PackageItem[];
}

export function buildPackagesPayload(items: any[], defaultImage: string = 'https://via.placeholder.com/300'): PackageItem[] {
  return items.map(item => {
    let images: string[] = item.images || [];
    
    if (images.length === 0) {
      images = [defaultImage, defaultImage, defaultImage];
    } else if (images.length === 1) {
      images = [images[0], images[0], images[0]];
    } else if (images.length === 2) {
      images = [images[0], images[1], images[1]];
    } else if (images.length > 3) {
      images = images.slice(0, 3);
    }
    
    return {
      name: item.name,
      qty: item.quantity || 1,
      valuedAt: item.price || 0,
      pictures: images
    };
  });
}

export function buildParcelPayload(
  receiverName: string,
  receiverPhone: string,
  receiverLocation: string,
  deliveryType: 'door_to_door' | 'office_collection',
  items: any[],
  receiverLocationDescription?: string
): ParcelPayload {
  
  if (!validateReceiverName(receiverName)) throw new Error("Invalid receiver name. Minimum 2 characters.");
  if (!validateReceiverPhone(receiverPhone)) throw new Error("Invalid receiver phone. Must match +265XXXXXXXXX.");
  if (!validateCity(receiverLocation).available) throw new Error("Invalid city. Smart Deliveries only operates in Lilongwe, Blantyre, Mzuzu, Zomba.");
  if (deliveryType === 'door_to_door' && !receiverLocationDescription) throw new Error("Location description is required for door-to-door delivery.");

  return {
    receiverName,
    receiverPhone,
    receiverLocation,
    receiverLocationDescription,
    deliveryType,
    packages: buildPackagesPayload(items)
  };
}

// Note: createParcel, listParcels, getParcel, syncParcelStatus are executed via Edge Functions 
// to prevent API key exposure on the frontend.
export async function createParcel(deliveryOrderId: string) {
  // Call the secure Edge Function
  const { data, error } = await supabase.functions.invoke('smart-deliveries-create-parcel', {
    body: { deliveryOrderId }
  });
  if (error) throw error;
  return data;
}

export async function syncParcelStatus() {
  const { data, error } = await supabase.functions.invoke('smart-deliveries-sync');
  if (error) throw error;
  return data;
}
