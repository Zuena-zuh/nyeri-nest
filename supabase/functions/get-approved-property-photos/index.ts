import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface ReqPayload {
  propertyIds: string[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  fetch: withSupabase(
    { auth: "publishable" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405 },
        );
      }

      try {
        let body: unknown;

        try {
          body = await req.json();
        } catch {
          return Response.json(
            { error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        if (
          typeof body !== "object" ||
          body === null ||
          !("propertyIds" in body) ||
          !Array.isArray(body.propertyIds) ||
          body.propertyIds.length === 0 ||
          body.propertyIds.length > 50 ||
          !body.propertyIds.every(
            (id) => typeof id === "string" && UUID_PATTERN.test(id),
          )
        ) {
          return Response.json(
            { error: "Invalid property IDs" },
            { status: 400 },
          );
        }

        const propertyIds = [...new Set(body.propertyIds)];

        if (propertyIds.length === 0) {
          return Response.json({ photos: [] });
        }

        const { data: properties, error: propertyError } = await ctx
          .supabaseAdmin
          .from("properties")
          .select("id, owner_id")
          .in("id", propertyIds)
          .eq("status", "approved");

        if (propertyError) throw propertyError;

        if (!properties || properties.length === 0) {
          return Response.json({ photos: [] });
        }

        const approvedIds = properties.map((p) => p.id);

        const owners = new Map(
          properties.map((p) => [p.id, p.owner_id]),
        );

        const { data: photos, error: photoError } = await ctx.supabaseAdmin
          .from("property_photos")
          .select(
            "id, property_id, owner_id, storage_path, alt_text, is_primary",
          )
          .in("property_id", approvedIds)
          .order("created_at", { ascending: false })
          .limit(300);

        if (photoError) throw photoError;

        const results = await Promise.all(
          (photos || []).map(async (photo: {
            id: string;
            property_id: string;
            owner_id: string;
            storage_path: string;
            alt_text: string | null;
            is_primary: boolean;
          }) => {
            const ownerId = owners.get(photo.property_id);

            if (
              !ownerId ||
              photo.owner_id !== ownerId ||
              !photo.storage_path.startsWith(
                `${ownerId}/${photo.property_id}/`,
              )
            ) {
              return null;
            }

            const { data, error } = await ctx.supabaseAdmin.storage
              .from("property-photos")
              .createSignedUrl(photo.storage_path, 3600);

            if (error || !data?.signedUrl) return null;

            return {
              id: photo.id,
              property_id: photo.property_id,
              url: data.signedUrl,
              alt_text: photo.alt_text,
              is_primary: photo.is_primary,
            };
          }),
        );

        return Response.json({
          photos: results.filter(Boolean),
        });
      } catch (error) {
        console.error("Photo function error:", error);

        return Response.json(
          { error: "Unable to retrieve property photos" },
          { status: 500 },
        );
      }
    },
  ),
};
