import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { coupon } = body;

  const { data: couponData, error: fetchError } = await supabase
    .from("coupons")
    .select("used_count")
    .eq("code", coupon)
    .single();

  if (fetchError || !couponData) {
    return NextResponse.json(
      { success: false, error: "Coupon not found" },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabase
    .from("coupons")
    .update({ used_count: couponData.used_count + 1 })
    .eq("code", coupon);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
