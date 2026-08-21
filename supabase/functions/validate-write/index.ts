import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { admissionsAppSchema, gradeEntrySchema } from "../_shared/schemas.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const defaultHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Initialize Supabase client propagating the user's JWT
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: defaultHeaders,
      });
    }

    const { action, payload } = await req.json();

    if (action === "submit_application") {
      const parsed = admissionsAppSchema.safeParse(payload);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error.issues }), { 
          status: 400, 
          headers: defaultHeaders 
        });
      }

      // Perform DB write using the user's RLS context
      const { data, error } = await supabase.from("admissions_apps").insert({
        ...parsed.data,
        applicant_user_id: user.id,
        status: 'pending'
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 200, 
        headers: defaultHeaders 
      });
    }

    if (action === "submit_grade") {
      const parsed = gradeEntrySchema.safeParse(payload);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error.issues }), { 
          status: 400, 
          headers: defaultHeaders 
        });
      }

      // Update grade, rely on RLS to enforce window and lecturer assignment
      const { data, error } = await supabase.from("grades").update({
        ca_score: parsed.data.ca_score,
        exam_score: parsed.data.exam_score,
        final_grade: parsed.data.final_grade,
        entered_by: user.id,
        entered_at: new Date().toISOString()
      })
      .eq('enrollment_id', parsed.data.enrollment_id)
      .select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { 
        status: 200, 
        headers: defaultHeaders 
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { 
      status: 400, 
      headers: defaultHeaders 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: defaultHeaders 
    });
  }
});
