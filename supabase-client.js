
const SUPABASE_URL = "https://ioxlraguxntanpfcpesi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yT_SXDG6CIGItvDJwPe9kA_OLCsIwu5";

const nyeriNestSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log("NyeriNest Supabase client initialized.");


async function testNyeriNestDatabase() {
  const { data, error } = await nyeriNestSupabase
    .from("properties")
    .select("id, title, neighbourhood, monthly_rent_kes, status")
    .eq("status", "approved")
    .limit(5);

  if (error) {
    console.error("NyeriNest database test failed:", error.message);
    return;
  }

  console.log("NyeriNest database read successful!");
  console.log("Approved listings returned:", data.length);
  console.log("Listings:", data);
}

testNyeriNestDatabase();
