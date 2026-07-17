export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
};

export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayModule = {
  open: (options: RazorpayCheckoutOptions) => Promise<RazorpaySuccessPayload>;
};

function getRazorpayCheckout(): RazorpayModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const mod = require("react-native-razorpay") as RazorpayModule | { default: RazorpayModule };
    const resolved = "default" in mod ? mod.default : mod;
    if (!resolved || typeof resolved.open !== "function") {
      throw new Error("Razorpay module loaded without open()");
    }
    return resolved;
  } catch {
    throw new Error(
      "Razorpay native module is unavailable. Use a development build (`npx expo run:android`) instead of Expo Go.",
    );
  }
}

export function isRazorpayCheckoutAvailable() {
  try {
    getRazorpayCheckout();
    return true;
  } catch {
    return false;
  }
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions) {
  const checkout = getRazorpayCheckout();
  return checkout.open(options);
}
