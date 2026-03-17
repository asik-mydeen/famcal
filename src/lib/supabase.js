import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadAvatar(memberId, file) {
  const ext = file.name.split(".").pop();
  const path = `${memberId}.${ext}`;

  // Remove old avatar if exists (different extension)
  const { data: list } = await supabase.storage.from("avatars").list("", { search: memberId });
  if (list) {
    for (const f of list) {
      if (f.name.startsWith(memberId)) {
        await supabase.storage.from("avatars").remove([f.name]);
      }
    }
  }

  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Append cache-buster so browser picks up new image
  return `${data.publicUrl}?t=${Date.now()}`;
}
