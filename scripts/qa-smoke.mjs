import axios from "axios";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function checkPublicApis() {
  const products = await axios.get(`${baseURL}/api/products/listing`, {
    params: { page: 1, limit: 3 },
  });
  const categories = await axios.get(`${baseURL}/api/categories`);

  if (!products.data?.success) throw new Error("Products listing failed");
  if (!categories.data?.success) throw new Error("Categories failed");

  return {
    products: products.data.data.products.length,
    categories: categories.data.data.length,
  };
}

async function checkMobileAuth() {
  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;
  if (!email || !password) {
    return { skipped: true };
  }

  const login = await axios.post(`${baseURL}/api/mobile/auth/login`, { email, password });
  if (!login.data?.success) throw new Error("Mobile login failed");
  const accessToken = login.data.data.accessToken;

  const me = await axios.get(`${baseURL}/api/mobile/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!me.data?.success) throw new Error("Mobile /me failed");

  return { skipped: false, userId: me.data.data.id };
}

async function run() {
  const publicResult = await checkPublicApis();
  const authResult = await checkMobileAuth();

  console.log("QA smoke passed", {
    baseURL,
    publicResult,
    authResult,
  });
}

run().catch((error) => {
  console.error("QA smoke failed", error.message);
  process.exit(1);
});
