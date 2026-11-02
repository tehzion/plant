-- The consultation WhatsApp line moved to +60146193328. Existing leads keep
-- the number they were sent to; only new rows get the new default.
alter table public.consultation_leads alter column phone set default '+60146193328';
