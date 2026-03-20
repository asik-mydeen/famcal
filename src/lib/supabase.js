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

// ── Meals ──
export async function fetchMeals(familyId, startDate, endDate) {
  const { data } = await supabase
    .from("meals")
    .select("*")
    .eq("family_id", familyId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");
  return data || [];
}

export async function upsertMeal(meal) {
  const { data } = await supabase.from("meals").upsert(meal).select().single();
  return data;
}

export async function deleteMeal(id) {
  await supabase.from("meals").delete().eq("id", id);
}

// ── Lists ──
export async function fetchLists(familyId) {
  const { data: lists } = await supabase
    .from("lists")
    .select("*")
    .eq("family_id", familyId)
    .order("sort_order");
  if (!lists) return [];
  // Fetch items for each list
  const listIds = lists.map((l) => l.id);
  const { data: items } = await supabase
    .from("list_items")
    .select("*")
    .in("list_id", listIds)
    .order("sort_order");
  return lists.map((l) => ({
    ...l,
    items: (items || []).filter((i) => i.list_id === l.id),
  }));
}

export async function createList(list) {
  const { data } = await supabase.from("lists").insert(list).select().single();
  return data;
}

export async function deleteList(id) {
  await supabase.from("lists").delete().eq("id", id);
}

export async function createListItem(item) {
  const { data } = await supabase.from("list_items").insert(item).select().single();
  return data;
}

export async function updateListItem(id, updates) {
  const { data } = await supabase.from("list_items").update(updates).eq("id", id).select().single();
  return data;
}

export async function deleteListItem(id) {
  await supabase.from("list_items").delete().eq("id", id);
}

// ── Notes ──
export async function fetchNotes(familyId) {
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createNote(note) {
  const { data } = await supabase.from("notes").insert(note).select().single();
  return data;
}

export async function updateNote(id, updates) {
  const { data } = await supabase.from("notes").update(updates).eq("id", id).select().single();
  return data;
}

export async function deleteNote(id) {
  await supabase.from("notes").delete().eq("id", id);
}

// ── Countdowns ──
export async function fetchCountdowns(familyId) {
  const { data } = await supabase
    .from("countdowns")
    .select("*")
    .eq("family_id", familyId)
    .gte("target_date", new Date().toISOString().split("T")[0])
    .order("target_date");
  return data || [];
}

export async function createCountdown(countdown) {
  const { data } = await supabase.from("countdowns").insert(countdown).select().single();
  return data;
}

export async function deleteCountdown(id) {
  await supabase.from("countdowns").delete().eq("id", id);
}

// ── Photos ──
export async function fetchPhotos(familyId) {
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("family_id", familyId)
    .order("sort_order");
  return (data || []).map((p) => ({
    ...p,
    url: supabase.storage.from("photos").getPublicUrl(p.storage_path).data?.publicUrl,
  }));
}

export async function uploadPhoto(familyId, file, caption) {
  const path = `family-photos/${familyId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("photos").upload(path, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
  const { data } = await supabase
    .from("photos")
    .insert({
      family_id: familyId,
      storage_path: path,
      caption: caption || "",
    })
    .select()
    .single();
  return { ...data, url: urlData?.publicUrl };
}

export async function deletePhoto(photo) {
  await supabase.storage.from("photos").remove([photo.storage_path]);
  await supabase.from("photos").delete().eq("id", photo.id);
}
