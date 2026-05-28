-- Enable realtime CDC for DriverLocations
alter publication supabase_realtime add table "DriverLocations";

alter table "DriverLocations" enable row level security;

-- Admin can view every row (God Mode)
drop policy if exists driverlocations_admin_select on "DriverLocations";
create policy driverlocations_admin_select
on "DriverLocations"
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('ADMIN', 'SUPER_ADMIN')
);

-- Advertiser can only see drivers linked to active campaigns they own
-- Requires view/table with advertiser_id + driver_id rows for active contracts.
drop policy if exists driverlocations_advertiser_select on "DriverLocations";
create policy driverlocations_advertiser_select
on "DriverLocations"
for select
to authenticated
using (
  exists (
    select 1
    from mv_active_campaigns mac
    where mac.driver_id = "DriverLocations"."driverId"
      and mac.advertiser_id = (auth.jwt() -> 'app_metadata' ->> 'entityId')::uuid
      and mac.is_active = true
  )
);
