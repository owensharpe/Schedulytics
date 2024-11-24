import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "REDACTED";
const supabaseKey = "REDACTED";

export const supabase = createClient(supabaseUrl, supabaseKey);
