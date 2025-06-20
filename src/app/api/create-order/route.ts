import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabase } from "@/lib/supabase";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const BASE_AMOUNT = 149900; // ₹1499 in paise

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, returnUrl, coupon } = await request.json();

    // Validate required fields
    if (!plan || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let finalAmount = BASE_AMOUNT;

    if (coupon) {
      const { data, error } = await supabase
        .from("coupons")
        .select("discount_percent, active, expires_at, used_count, max_uses")
        .eq("code", coupon.trim().toUpperCase())
        .single();

      const now = new Date();
      const expired = data?.expires_at && new Date(data.expires_at) < now;
      const overLimit = data?.max_uses && data.used_count >= data.max_uses;

      const valid = data && data.active && !expired && !overLimit;

      if (valid) {
        finalAmount = Math.floor(
          BASE_AMOUNT - (BASE_AMOUNT * data.discount_percent) / 100
        );
      } else {
        return NextResponse.json(
          { error: "Invalid or expired coupon" },
          { status: 400 }
        );
      }
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: finalAmount, // Already in paise
      currency: "INR",
      receipt: `rpt_${userId}`,
      notes: {
        user_id: userId,
        plan_id: plan,
        return_url: returnUrl,
        coupon_code: coupon || "none",
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error: any) {
    console.error("Order creation failed:", error);
    return NextResponse.json(
      { error: "Order creation failed" },
      { status: 500 }
    );
  }
}
