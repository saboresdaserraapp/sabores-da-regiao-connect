import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "./whatsapp";

/**
 * Central service for user orders to ensure consistency across the app.
 */
export const userOrdersService = {
  /**
   * Fetches all orders for the currently logged-in user.
   * Prioritizes user_id but falls back to phone number if profile exists.
   */
  async getMyOrders(userId: string) {
    console.log("userOrdersService: getMyOrders", userId);
    
    // 1. Get user profile for phone fallback
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .maybeSingle();

    const normalizedPhone = profile?.phone ? normalizePhone(profile.phone) : null;
    
    // 2. Build query
    let query = supabase
      .from("orders")
      .select("*, establishments(name, slug, logo, whatsapp)")
      .order("created_at", { ascending: false });

    if (normalizedPhone) {
      // Find orders by user_id OR by customer_phone matching normalized profile phone
      // To strictly match "exactly", we normalize both in our app code or filter here
      // But query.or is good for initial fetch.
      query = query.or(`user_id.eq.${userId},customer_phone.eq.${normalizedPhone}`);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Fallback normalizer to double check exact match if it was legay/messy in DB
    if (normalizedPhone) {
      return (data || []).filter(o => 
        o.user_id === userId || 
        (o.customer_phone && normalizePhone(o.customer_phone) === normalizedPhone)
      );
    }

    return data || [];
  },

  /**
   * Fetches a specific order by ID and validates ownership.
   */
  async getMyOrderById(orderId: string, userId: string) {
    console.log("userOrdersService: getMyOrderById", { orderId, userId });
    
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, establishments(*), checkout_delivery_info(*)")
      .eq("id", orderId)
      .maybeSingle();
      
    if (error) throw error;
    if (!order) return null;

    // Security check: must belong to user or match phone
    if (order.user_id === userId) return order;

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .maybeSingle();
    
    const normalizedUserPhone = profile?.phone ? normalizePhone(profile.phone) : null;
    const normalizedOrderPhone = order.customer_phone ? normalizePhone(order.customer_phone) : null;

    if (normalizedUserPhone && normalizedOrderPhone && normalizedUserPhone === normalizedOrderPhone) {
      return order;
    }

    console.warn("userOrdersService: Access denied to order", orderId);
    return null;
  },

  /**
   * Fetches active orders for the floating button.
   */
  async getMyActiveOrders(userId: string) {
    const orders = await this.getMyOrders(userId);
    const activeStatuses = [
      "waiting_business_confirmation",
      "confirmed_by_business",
      "preparing",
      "ready_for_pickup",
      "out_for_delivery",
      "customer_not_responding",
      "needs_more_reference"
    ];
    
    return orders.filter(o => activeStatuses.includes(o.status));
  }
};
