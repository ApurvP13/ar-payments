"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

// Separate component to handle search params
function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState("");

  const plan = searchParams.get("plan") || "";
  const userId = searchParams.get("user") || "";
  const amount = parseInt(searchParams.get("amount") || "0");
  const returnUrl = searchParams.get("return_url") || "";
  const couponCode = searchParams.get("coupon") || "";

  useEffect(() => {
    const validateCoupon = async () => {
      try {
        if (couponCode) {
          const couponResponse = await fetch("/api/validate-coupon", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ coupon: couponCode }),
          });

          const couponResult = await couponResponse.json();

          if (couponResult.valid) {
            const discount = couponResult.discount;
            const discountedAmount = Math.floor(
              amount - (amount * discount) / 100
            );

            setFinalAmount(discountedAmount); // use state instead of direct assignment
            setAppliedCouponId(couponResult.code);
          } else {
            setError("Invalid or expired coupon");
            setIsLoading(false);
            setFinalAmount(amount);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    validateCoupon(); // invoke it
  }, []);

  const planNames: { [key: string]: string } = {
    basic: "Basic Plan",
    premium: "Premium Plan",
    pro: "Pro Plan",
  };

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!plan || !userId || !amount) {
      setError("Missing payment parameters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Fetch user info
      const { data: userProfile, error } = await supabase
        .from("user_profile")
        .select("display_name, email")
        .eq("user_id", userId)
        .single();

      if (error || !userProfile) {
        throw new Error("Unable to fetch user info");
      }

      const { display_name, email } = userProfile;

      // Create order with finalAmount
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalAmount,
          plan,
          userId,
          returnUrl,
        }),
      });

      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || "Failed to create order");
      }

      // Razorpay modal config
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "AI Reader",
        description: `${planNames[plan] || "Subscription Plan"}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            if (appliedCouponId) {
              await fetch("/api/mark-coupon-used", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ couponId: appliedCouponId }),
              });
            }

            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId,
                plan,
                email, // 👈 Attach user's email
              }),
            });

            const verifyResult = await verifyResponse.json();

            if (verifyResponse.ok) {
              const successUrl = `${returnUrl}?status=success&payment_id=${response.razorpay_payment_id}`;
              window.location.href = successUrl;
            } else {
              throw new Error(
                verifyResult.error || "Payment verification failed"
              );
            }
          } catch (error: any) {
            const errorUrl = `${returnUrl}?status=error&message=${encodeURIComponent(
              error.message
            )}`;
            window.location.href = errorUrl;
          }
        },
        prefill: {
          name: display_name || "User",
          email: email || "user@example.com",
          // contact: "9999999999", // optional — fill from your database if stored
        },
        notes: {
          user_id: userId,
          plan_id: plan,
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      };

      if (!(window as any).Razorpay) {
        setError("Razorpay SDK failed to load. Please refresh the page.");
        setIsLoading(false);
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Payment initialization failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-black flex items-center justify-center p-4">
      <div className="backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8 max-w-md w-full text-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Reader</h1>
          <p className="text-gray-300">Complete your payment</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center py-2 border-b border-white/20">
            <span className="text-gray-400">Plan:</span>
            <span className="font-semibold">{planNames[plan] || plan}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/20">
            <span className="text-gray-400">Amount:</span>
            <span className="font-semibold text-xl">₹{finalAmount}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400">User ID:</span>
            <span className="font-mono text-sm">{userId}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-400/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={isLoading || !plan || !userId || !amount}
          className="w-full bg-blue-600/80 hover:bg-blue-500/90 hover:shadow-blue-500/50 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 ease-in-out flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
