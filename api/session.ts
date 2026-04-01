import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.cookies['sb-session'];
  if (!token) return res.status(200).json({ user: null, salon: null });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(200).json({ user: null, salon: null });

  const { data: membership } = await supabase
    .from('salon_members')
    .select('salon_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let salon = null;
  if (membership?.salon_id) {
    const { data: salonData } = await supabase
      .from('salons')
      .select('*')
      .eq('id', membership.salon_id)
      .maybeSingle();
    salon = salonData;
  }

  res.status(200).json({ user, salon });
}