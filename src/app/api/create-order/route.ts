import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { amount, plan, userId, returnUrl } = await request.json();

    // Validate required fields
    if (!amount || !plan || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`receipt_${userId}`);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `rpt_${userId}`,
      notes: {
        user_id: userId,
        plan_id: plan,
        return_url: returnUrl,
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
