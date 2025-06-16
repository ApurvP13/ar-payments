import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("Webhook received:", event.event);

    // Handle different webhook events
    switch (event.event) {
      case "payment.captured":
        await handlePaymentSuccess(event.payload.payment.entity);
        break;

      case "payment.failed":
        await handlePaymentFailure(event.payload.payment.entity);
        break;

      default:
        console.log("Unhandled webhook event:", event.event);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(payment: any) {
  console.log("Payment successful:", {
    paymentId: payment.id,
    amount: payment.amount,
    userId: payment.notes?.user_id,
    planId: payment.notes?.plan_id,
  });

  // Update your main app's database via API call
  try {
    // If you have a shared database, update directly
    // Or make an API call to your main app

    console.log("User plan updated successfully in main app");
  } catch (error) {
    console.error("Failed to update user plan:", error);
    // You might want to implement retry logic or manual verification
  }
}

async function handlePaymentFailure(payment: any) {
  console.log("Payment failed:", {
    paymentId: payment.id,
    userId: payment.notes?.user_id,
    planId: payment.notes?.plan_id,
    errorDescription: payment.error_description,
  });

  // TODO: Handle payment failure
  // Example: Send notification, log for retry, etc.
}

// 100xmba@gmail.com
// 100xmbadebayan!
