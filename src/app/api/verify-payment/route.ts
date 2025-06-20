import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      userId,
      plan,
      email,
      couponCode, // 👈 You send this from frontend only if used
    } = await request.json();

    // ✅ Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    console.log("✅ Payment verified:", {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId,
      plan,
      couponCode,
    });

    // ✅ If a coupon was used, increment used_count
    if (couponCode && couponCode !== "") {
      // Fetch current used_count
      const { data: couponData, error: fetchError } = await supabase
        .from("coupons")
        .select("used_count")
        .eq("code", couponCode)
        .single();

      if (!fetchError && couponData) {
        const { error: updateError } = await supabase
          .from("coupons")
          .update({ used_count: couponData.used_count + 1 })
          .eq("code", couponCode);

        if (updateError) {
          console.error("Failed to update used_count:", updateError.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
