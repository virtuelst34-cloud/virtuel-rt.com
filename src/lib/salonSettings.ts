import { supabase } from "./supabase";

export async function getSalonSettings(salonId:string){
  try {
    if(!salonId) return null;

    const {data,error}=await supabase
      .from("salon_settings")
      .select("*")
      .eq("salon_id", salonId)
      .maybeSingle();

    if(error){
      console.warn("Salon settings unavailable:", error.message);
      return null;
    }

    return data;
  } catch(e){
    console.warn("Salon settings failed:", e);
    return null;
  }
}

export async function updateSalonWelcome(salonId:string,message:string){
  try {
    return await supabase.from("salon_settings").upsert({
      salon_id: salonId,
      welcome_message: message,
      welcome_enabled: true
    });
  } catch(e){
    console.warn("Update salon welcome failed:", e);
    return null;
  }
}
