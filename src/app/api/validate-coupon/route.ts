// app/api/validate-coupon/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const coupon = body.coupon;

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", coupon.trim().toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false });
  }

  const now = new Date();
  const expired = data.expires_at && new Date(data.expires_at) < now;
  const overLimit = data.max_uses && data.used_count >= data.max_uses;

  if (!data.active || expired || overLimit) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    discount: data.discount_percent,
    id: data.id,
  });
}
