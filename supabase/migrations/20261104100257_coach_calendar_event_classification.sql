-- Il coach può classificare eventi importati senza poter modificare altri dati
-- Google o consegnare accesso alla tabella al browser.
create or replace function public.coach_classify_external_event(
 p_id bigint,p_venue_id text,p_is_course boolean,p_blocks_booking boolean)
returns void language plpgsql security definer set search_path='' as $classify$
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 if p_venue_id is null or not exists(select 1 from public.venues where id=p_venue_id) then
  raise exception 'Seleziona una sede reale per classificare questo evento'; end if;
 update public.external_calendar_events
 set venue_id=p_venue_id,is_course=coalesce(p_is_course,false),
     blocks_booking=coalesce(p_blocks_booking,true),needs_review=false,updated_at=now()
 where id=p_id;
 if not found then raise exception 'Evento non trovato'; end if;
end;
$classify$;
revoke all on function public.coach_classify_external_event(bigint,text,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.coach_classify_external_event(bigint,text,boolean,boolean)
 to authenticated;
