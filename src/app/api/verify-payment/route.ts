import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      userId,
      plan,
      email,
    } = await request.json();

    // Verify payment signature
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

    // Payment verified successfully
    console.log("Payment verified successfully:", {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId,
      plan,
    });

    // TODO: Update your main app's database here
    // You can make an API call to your main app's backend
    // Or update the database directly if both apps share the same DB

    // Example API call to main app:
    // await fetch('https://your-main-app.com/api/update-user-plan', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     userId,
    //     plan: 'paid',
    //     paymentId: razorpay_payment_id,
    //     orderId: razorpay_order_id
    //   })
    // })

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
