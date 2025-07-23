// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const load = async ({ parent }: { parent: any }) => {
  // Get the supabase client from the parent layout
  const { supabase } = await parent()
  
  return {
    supabase
  }
}
