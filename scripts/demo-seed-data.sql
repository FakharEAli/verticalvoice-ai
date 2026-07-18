-- ============================================================================
-- Harbor House Kitchen — full demo dataset
--
-- Purpose: every dashboard surface (Overview, Analytics, Call History, call
-- detail, Operations, Contacts, Audit, Usage) shows real numbers instead of
-- zeros and empty states, so the product can be demoed live.
--
-- PREREQUISITE: run scripts/demo-seed-menu.sql FIRST. Order line items are
-- priced by joining menu_items, so without the menu every order totals $0.00.
-- This file raises an exception rather than silently seeding $0 orders.
--
-- Idempotent: deterministic UUIDs + ON CONFLICT DO NOTHING. Safe to re-run.
-- Timestamps are all relative to now(), so the data never goes stale.
--
-- UUID scheme: 'e0000000-0000-4000-8000-0000' || BB || NNNN
--   BB is the per-table block below, NNNN the row number. The 'e' prefix keeps
--   this file's cleanup fully separable from demo-seed-menu.sql ('d' prefix).
--
--   01 calls              08 call_participants   15 restaurant_complaints
--   02 call_transcripts   09 call_costs          16 audit_events
--   03 call_summaries     10 reservations        17 notifications
--   04 call_outcomes      11 orders              18 usage_ledger
--   05 call_evaluations   12 order_items         19 usage_limits
--   06 call_tool_runs     13 contacts            20 billing_accounts
--   07 call_events        14 catering_leads      21 recording_consents
--
-- Every seeded call has is_test = false. Test calls are excluded from Overview
-- stats and all of Analytics (`.eq("is_test", false)`), so a demo dataset that
-- forgot this flag would render as zeros on exactly the pages that matter.
-- ============================================================================

BEGIN;

\set tenant '''c8460639-2c35-480f-8b2f-c7b425740207'''
\set biz    '''+13617778899'''
\set twilio '''+13616051492'''

-- ── Guard: the menu must exist or every order total is wrong ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM menu_items WHERE id = 'd0000000-0000-4000-8000-000000000211'
  ) THEN
    RAISE EXCEPTION
      'demo-seed-menu.sql has not been run. Order line items are priced from menu_items; run that file first.';
  END IF;
END $$;

-- ============================================================================
-- CALL SPECS
--
-- One row per call. `d` / `h` / `mi` place the call on an explicit day and
-- hour-of-day rather than a flat "N minutes ago" offset, so the Analytics
-- daily chart and the four-hour-block chart both have a realistic shape
-- (lunch rush, dinner rush, quiet mid-afternoon) instead of a straight line.
--
-- `kind` is the join key for transcript, summary, outcome, tool runs and
-- events below — 80 hand-written transcripts would be unmaintainable, so a
-- template per call type is personalised per call with the caller's details.
--
-- TEMP tables rather than CTEs: the same spec feeds nine child tables, and
-- repeating a 80-row VALUES list nine times is unreadable and error-prone.
-- ON COMMIT DROP keeps them from leaking out of this transaction.
-- ============================================================================

CREATE TEMP TABLE _spec (
  n      INT PRIMARY KEY,
  kind   TEXT NOT NULL,
  dir    TEXT NOT NULL,
  st     TEXT NOT NULL,
  d      INT  NOT NULL,           -- days ago
  h      INT  NOT NULL,           -- hour of day, server local
  mi     INT  NOT NULL,
  dur    INT,                     -- seconds; NULL for unanswered calls
  phone  TEXT NOT NULL,
  person TEXT NOT NULL,
  party  TEXT NOT NULL DEFAULT '2',
  tm     TEXT NOT NULL DEFAULT 'seven thirty',
  total  TEXT NOT NULL DEFAULT 'thirty two dollars'
) ON COMMIT DROP;

INSERT INTO _spec (n, kind, dir, st, d, h, mi, dur, phone, person, party, tm, total) VALUES
 ( 1,'reserve'   ,'inbound' ,'completed',29,18,12, 78,'+13615540118','Marisol Trevino'  ,'4','seven thirty','' ),
 ( 2,'takeout'   ,'inbound' ,'completed',29,12,41,141,'+13615540219','Dale Kowalczyk'   ,'2','noon'        ,'thirty one dollars'),
 ( 3,'hours'     ,'inbound' ,'completed',28,10, 8, 34,'+13615540327','Bernice Ochoa'    ,'2','ten'         ,''),
 ( 4,'reserve'   ,'inbound' ,'completed',28,17,55, 71,'+13615540431','Cody Villarreal'  ,'2','six fifteen' ,''),
 ( 5,'delivery'  ,'inbound' ,'completed',28,19,23,183,'+13615540544','Anita Bustamante' ,'3','seven'       ,'sixty one dollars'),
 ( 6,'allergen'  ,'inbound' ,'completed',27,13,17, 96,'+13615540657','Priya Raghunathan','2','one'         ,''),
 ( 7,'reserve'   ,'inbound' ,'completed',27,18,44, 84,'+13615540762','Grant Lindeman'   ,'6','eight'       ,''),
 ( 8,'no_answer' ,'inbound' ,'no_answer',27,21,50,NULL,'+13615540873','Unknown caller'  ,'2','nine'        ,''),
 ( 9,'takeout'   ,'inbound' ,'completed',26,12, 5,128,'+13615540981','Rosalie Fontenot' ,'2','noon'        ,'twenty six dollars'),
 (10,'wait'      ,'inbound' ,'completed',26,19,38, 41,'+13615541096','Terrence Boudreau','4','seven thirty',''),
 (11,'reserve'   ,'inbound' ,'completed',26,16,20, 69,'+13615541103','Katherine Salinas','2','five thirty' ,''),
 (12,'menu'      ,'inbound' ,'completed',25,11,32, 62,'+13615541217','Wyatt Delacroix'  ,'2','eleven'      ,''),
 (13,'reserve_big','inbound','completed',25,15, 9,167,'+13615541322','Ofelia Mendiola'  ,'12','six'        ,''),
 (14,'delivery'  ,'inbound' ,'completed',25,20,14,175,'+13615541436','Brandon Shackleford','4','eight'     ,'seventy four dollars'),
 (15,'catering'  ,'inbound' ,'completed',24,14,47,212,'+13615541548','Yolanda Cavazos'  ,'60','one'        ,''),
 (16,'reserve'   ,'inbound' ,'completed',24,18, 2, 74,'+13615541659','Peter Nakamura'   ,'2','seven'       ,''),
 (17,'takeout'   ,'inbound' ,'completed',24,12,29,133,'+13615541761','Deandra Whitlock' ,'3','twelve thirty','forty four dollars'),
 (18,'failed'    ,'outbound','failed'   ,24,10,15,NULL,'+13615541875','Unknown caller'  ,'2','ten'         ,''),
 (19,'reserve'   ,'inbound' ,'completed',23,17,41, 66,'+13615541983','Camille Arceneaux','4','six thirty'  ,''),
 (20,'hours'     ,'inbound' ,'completed',23,10,52, 29,'+13615542091','Hollis Tijerina'  ,'2','ten'         ,''),
 (21,'complaint' ,'inbound' ,'completed',23,20,31,246,'+13615542108','Sandra Guajardo'  ,'4','eight'       ,''),
 (22,'takeout'   ,'inbound' ,'completed',22,12,18,119,'+13615542216','Emmett Lonergan'  ,'2','noon'        ,'twenty two dollars'),
 (23,'reserve'   ,'inbound' ,'completed',22,18,26, 81,'+13615542324','Delia Portillo'   ,'2','seven thirty',''),
 (24,'ob_confirm','outbound','completed',22,15, 5, 52,'+13615540118','Marisol Trevino'  ,'4','seven thirty',''),
 (25,'delivery'  ,'inbound' ,'completed',22,19,49,158,'+13615542437','Jarrod Pemberton' ,'2','eight'       ,'forty eight dollars'),
 (26,'menu'      ,'inbound' ,'completed',21,11, 6, 57,'+13615542549','Lourdes Escamilla','2','eleven'      ,''),
 (27,'reserve'   ,'inbound' ,'completed',21,17,33, 72,'+13615542651','Ike Sandoval'     ,'3','six'         ,''),
 (28,'takeout'   ,'inbound' ,'completed',21,13,11,126,'+13615542768','Nadine Broussard' ,'2','one'         ,'thirty five dollars'),
 (29,'busy'      ,'inbound' ,'busy'     ,21,20,58,NULL,'+13615542879','Unknown caller'  ,'2','nine'        ,''),
 (30,'reserve'   ,'inbound' ,'completed',20,18,15, 88,'+13615542987','Alonzo Hinojosa'  ,'5','seven'       ,''),
 (31,'wait'      ,'inbound' ,'completed',20,19,44, 38,'+13615543095','Meredith Falcone' ,'2','seven thirty',''),
 (32,'allergen'  ,'inbound' ,'completed',20,12,50,103,'+13615543102','Simone Aguillard' ,'2','noon'        ,''),
 (33,'delivery'  ,'inbound' ,'completed',19,20, 7,169,'+13615543219','Ruben Ontiveros'  ,'4','eight'       ,'fifty three dollars'),
 (34,'reserve'   ,'inbound' ,'completed',19,16,38, 64,'+13615543327','Gwendolyn Mabry'  ,'2','five thirty' ,''),
 (35,'catering'  ,'inbound' ,'completed',19,14,12,198,'+13615543435','Malcolm Dietrich' ,'40','two'        ,''),
 (36,'takeout'   ,'inbound' ,'completed',18,12,26,131,'+13615543547','Charmaine Robicheaux','3','noon'     ,'thirty nine dollars'),
 (37,'reserve'   ,'inbound' ,'completed',18,18,53, 76,'+13615543658','Travis Longoria'  ,'4','seven thirty',''),
 (38,'hours'     ,'inbound' ,'completed',18,10,21, 31,'+13615543766','Estelle Naquin'   ,'2','ten'         ,''),
 (39,'no_answer' ,'inbound' ,'no_answer',18,22, 4,NULL,'+13615543874','Unknown caller'  ,'2','ten'         ,''),
 (40,'reserve'   ,'inbound' ,'completed',17,17,17, 70,'+13615543982','Louisa Pellerin'  ,'2','six'         ,''),
 (41,'delivery'  ,'inbound' ,'completed',17,19,35,161,'+13615544093','Damon Krautkramer','3','seven thirty','fifty seven dollars'),
 (42,'modify'    ,'inbound' ,'completed',17,15,48, 59,'+13615543658','Travis Longoria'  ,'6','eight'       ,''),
 (43,'takeout'   ,'inbound' ,'completed',16,13, 2,124,'+13615544107','Beatriz Quintanilla','2','one'       ,'twenty eight dollars'),
 (44,'reserve'   ,'inbound' ,'completed',16,18,29, 83,'+13615544215','Franklin Doucette','4','seven'       ,''),
 (45,'menu'      ,'inbound' ,'completed',16,11,41, 55,'+13615544329','Imelda Sepulveda' ,'2','eleven'      ,''),
 (46,'complaint' ,'inbound' ,'completed',15,20,18,231,'+13615544436','Curtis Thibodeaux','2','eight'       ,''),
 (47,'reserve'   ,'inbound' ,'completed',15,17, 7, 68,'+13615544548','Rosalind Chapa'   ,'3','six thirty'  ,''),
 (48,'takeout'   ,'inbound' ,'completed',15,12,44,137,'+13615544659','Oscar Benavides'  ,'2','noon'        ,'thirty three dollars'),
 (49,'ob_waitlist','outbound','completed',15,19,55, 44,'+13615543095','Meredith Falcone','2','seven thirty',''),
 (50,'reserve'   ,'inbound' ,'completed',14,18,36, 79,'+13615544767','Genevieve Alaniz' ,'2','seven thirty',''),
 (51,'wait'      ,'inbound' ,'completed',14,19,12, 36,'+13615544875','Roderick Prejean' ,'4','seven'       ,''),
 (52,'delivery'  ,'inbound' ,'completed',14,20,41,172,'+13615544983','Tamara Vasquez'   ,'5','eight thirty','sixty eight dollars'),
 (53,'allergen'  ,'inbound' ,'completed',13,13,25, 99,'+13615545091','Nathaniel Guillory','2','one'        ,''),
 (54,'reserve'   ,'inbound' ,'completed',13,17,50, 73,'+13615545106','Bianca Zamarripa' ,'4','six'         ,''),
 (55,'takeout'   ,'inbound' ,'completed',13,12, 9,129,'+13615545214','Harlan Bergeron'  ,'2','noon'        ,'twenty four dollars'),
 (56,'failed'    ,'outbound','failed'   ,13,11,30,NULL,'+13615545328','Unknown caller'  ,'2','eleven'      ,''),
 (57,'reserve'   ,'inbound' ,'completed',12,18,22, 86,'+13615545437','Constance Ybarra' ,'6','seven thirty',''),
 (58,'hours'     ,'inbound' ,'completed',12,10,45, 27,'+13615545549','Milton Hebert'    ,'2','ten'         ,''),
 (59,'delivery'  ,'inbound' ,'completed',12,19,58,165,'+13615545651','Yvette Landreneau','3','eight'       ,'forty six dollars'),
 (60,'catering'  ,'inbound' ,'completed',11,14,33,205,'+13615545768','Preston Ashworth' ,'80','two'        ,''),
 (61,'reserve'   ,'inbound' ,'completed',11,17,14, 67,'+13615545879','Adela Carbajal'   ,'2','five thirty' ,''),
 (62,'takeout'   ,'inbound' ,'completed',11,12,37,122,'+13615545987','Winston Melancon' ,'4','twelve thirty','fifty two dollars'),
 (63,'cancel'    ,'inbound' ,'completed',10,15,20, 47,'+13615544215','Franklin Doucette','4','seven'       ,''),
 (64,'reserve'   ,'inbound' ,'completed',10,18, 8, 75,'+13615546095','Josefina Rendon'  ,'3','seven'       ,''),
 (65,'menu'      ,'inbound' ,'completed',10,11,52, 58,'+13615546103','Clayton Fitzhugh' ,'2','eleven'      ,''),
 (66,'no_answer' ,'inbound' ,'no_answer',10,22,26,NULL,'+13615546218','Unknown caller'  ,'2','ten'         ,''),
 (67,'delivery'  ,'inbound' ,'completed', 9,20,11,178,'+13615546324','Serena Broussard' ,'4','eight'       ,'sixty two dollars'),
 (68,'reserve'   ,'inbound' ,'completed', 9,17,39, 71,'+13615546439','Lamar Whitfield'  ,'2','six thirty'  ,''),
 (69,'takeout'   ,'inbound' ,'completed', 9,13,16,134,'+13615546547','Paloma Iturralde' ,'2','one'         ,'twenty nine dollars'),
 (70,'complaint' ,'inbound' ,'completed', 8,20,44,238,'+13615546658','Weldon Trahan'    ,'2','eight thirty',''),
 (71,'reserve'   ,'inbound' ,'completed', 8,18, 5, 82,'+13615546766','Antonia Villagomez','5','seven thirty',''),
 (72,'wait'      ,'inbound' ,'completed', 8,19,28, 39,'+13615546874','Sterling Comeaux' ,'2','seven'       ,''),
 (73,'takeout'   ,'inbound' ,'completed', 7,12,13,127,'+13615546982','Ramona Elizondo'  ,'3','noon'        ,'thirty seven dollars'),
 (74,'reserve'   ,'inbound' ,'completed', 7,17,46, 77,'+13615547093','Desmond Fontenot' ,'4','six'         ,''),
 (75,'allergen'  ,'inbound' ,'completed', 6,13,31,101,'+13615547105','Vivian Castellano','2','one'         ,''),
 (76,'delivery'  ,'inbound' ,'completed', 6,19,50,170,'+13615547219','Garrett Naquin'   ,'2','eight'       ,'fifty one dollars'),
 (77,'reserve'   ,'inbound' ,'completed', 5,18,19, 85,'+13615547327','Leticia Marchand' ,'6','seven thirty',''),
 (78,'no_answer' ,'inbound' ,'no_answer', 5,22,41,NULL,'+13615547435','Unknown caller'   ,'2','ten'         ,''),
 (79,'takeout'   ,'inbound' ,'completed', 4,12,24,130,'+13615547548','Alvin Prudhomme'  ,'2','noon'        ,'twenty seven dollars'),
 (80,'reserve'   ,'inbound' ,'completed', 4,17,57, 74,'+13615547659','Marguerite Doiron','4','six thirty'  ,''),
 (81,'ob_confirm','outbound','completed', 3,15,22, 49,'+13615547659','Marguerite Doiron','4','six thirty'  ,''),
 (82,'delivery'  ,'inbound' ,'completed', 3,20,33,163,'+13615547767','Casey Boudreaux'  ,'3','eight'       ,'forty nine dollars'),
 (83,'reserve'   ,'inbound' ,'completed', 3,18,10, 80,'+13615547875','Odessa Kimbrough' ,'2','seven'       ,''),
 (84,'menu'      ,'inbound' ,'completed', 2,11,27, 56,'+13615547983','Hector Balderas'  ,'2','eleven'      ,''),
 (85,'reserve'   ,'inbound' ,'completed', 2,17,48, 69,'+13615548091','Juliette Sonnier' ,'3','six'         ,''),
 (86,'takeout'   ,'inbound' ,'completed', 2,12,35,132,'+13615548107','Barrett Coleman'  ,'2','twelve thirty','thirty eight dollars'),
 (87,'catering'  ,'inbound' ,'completed', 1,14,18,201,'+13615548216','Rosemary Aucoin'  ,'25','two'        ,''),
 (88,'reserve'   ,'inbound' ,'completed', 1,18,42, 87,'+13615548324','Emory Lafitte'    ,'4','seven thirty',''),
 (89,'wait'      ,'inbound' ,'completed', 1,19,15, 37,'+13615548437','Colette Menard'   ,'2','seven'       ,''),
 (90,'takeout'   ,'inbound' ,'completed', 1,12,52,125,'+13615548549','Rowan Thibodaux'  ,'2','one'         ,'twenty three dollars'),
 (91,'reserve'   ,'inbound' ,'completed', 0,11,30, 72,'+13615548651','Solange Pitre'    ,'4','seven thirty',''),
 (92,'hours'     ,'inbound' ,'completed', 0,10,12, 30,'+13615548768','Augustin Reyna'   ,'2','ten'         ,''),
 (93,'takeout'   ,'inbound' ,'completed', 0,12,48,136,'+13615548879','Nell Fauntleroy'  ,'3','one'         ,'forty one dollars');

-- Calls dated "today" (d = 0) would land in the future if the demo is run
-- before that hour, which breaks the Analytics range filter and makes the
-- rows silently vanish. Clamp them to just-now instead.
CREATE TEMP TABLE _calls ON COMMIT DROP AS
SELECT
  s.*,
  ('e0000000-0000-4000-8000-000000' || '01' || lpad(s.n::text, 4, '0'))::uuid AS call_id,
  LEAST(
    date_trunc('day', now())
      - (s.d || ' days')::interval
      + (s.h || ' hours')::interval
      + (s.mi || ' minutes')::interval,
    now() - interval '18 minutes'
  ) AS started_at
FROM _spec s;

ALTER TABLE _calls ADD COLUMN ended_at TIMESTAMPTZ;
UPDATE _calls SET ended_at = started_at + (dur || ' seconds')::interval WHERE dur IS NOT NULL;

-- Spoken form of the party size. The voice rules require numbers to be spoken
-- naturally ("a table for four"), so transcripts substitute this, while the
-- written summaries and the structured tool input keep the digit.
ALTER TABLE _calls ADD COLUMN partyw TEXT;
UPDATE _calls SET partyw = CASE party
  WHEN '2' THEN 'two'      WHEN '3'  THEN 'three'  WHEN '4'  THEN 'four'
  WHEN '5' THEN 'five'     WHEN '6'  THEN 'six'    WHEN '12' THEN 'twelve'
  WHEN '25' THEN 'twenty five' WHEN '40' THEN 'forty'
  WHEN '60' THEN 'sixty'   WHEN '80' THEN 'eighty'
  ELSE party END;

-- ── calls ───────────────────────────────────────────────────────────────────
INSERT INTO calls (
  id, tenant_id, provider_call_id, ultravox_call_id, direction, status,
  caller_number, called_number, duration_seconds, started_at, ended_at,
  recording_url, is_test, outbound_purpose, created_at, updated_at
)
SELECT
  c.call_id,
  :tenant::uuid,
  'CAdemo' || lpad(c.n::text, 26, '0'),
  CASE WHEN c.dur IS NOT NULL
       THEN 'uvdemo-' || lpad(c.n::text, 6, '0') END,
  c.dir,
  c.st,
  CASE WHEN c.dir = 'inbound' THEN c.phone ELSE :twilio END,
  CASE WHEN c.dir = 'inbound' THEN :twilio ELSE c.phone END,
  c.dur,
  c.started_at,
  c.ended_at,
  CASE WHEN c.st = 'completed'
       THEN 'https://storage.verticalvoice.ai/demo/recordings/' || lpad(c.n::text, 4, '0') || '.mp3' END,
  false,
  CASE c.kind
    WHEN 'ob_confirm'  THEN 'reservation_confirmation'
    WHEN 'ob_waitlist' THEN 'table_ready_callback'
    WHEN 'failed'      THEN 'reservation_confirmation'
  END,
  c.started_at,
  COALESCE(c.ended_at, c.started_at)
FROM _calls c
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TRANSCRIPTS
--
-- These are the demo. They deliberately model the CONCISE agent behaviour
-- defined in src/industries/core/voice-rules.ts, not the verbose pre-fix
-- agent: one or two short sentences per turn, one question per turn, no
-- "I'd be happy to help" / "Great news" padding, confirmation folded into
-- the next question rather than read back item by item, and the AGENT
-- closing the call rather than waiting to be dismissed.
--
-- The `Agent:` / `Caller:` line prefixes are load-bearing: the call detail
-- page's parseTranscript() only renders the two-sided bubble view when every
-- speaker line carries a recognised label. Without them it falls back to
-- dumping raw text into a <pre>, which is not what you want on a projector.
-- ============================================================================

CREATE TEMP TABLE _tmpl (
  kind        TEXT PRIMARY KEY,
  body        TEXT NOT NULL,
  summary     TEXT NOT NULL,
  sentiment   TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  disposition TEXT NOT NULL,
  key_points  JSONB NOT NULL,
  actions     JSONB NOT NULL
) ON COMMIT DROP;

INSERT INTO _tmpl (kind, body, summary, sentiment, outcome, disposition, key_points, actions) VALUES
('reserve',
'Agent: Harbor House Kitchen, this is the front desk. How can I help?
Caller: Hi, I''d like to book a table.
Agent: Sure. What day and time?
Caller: Tonight at {TIME} if you have it.
Agent: How many people?
Caller: There''ll be {PARTYW} of us.
Agent: We have {TIME}. What name should I put it under?
Caller: {NAME}.
Agent: Got it. And the best number for you?
Caller: The one I''m calling from.
Agent: You''re booked for {PARTYW} at {TIME} under {NAME}. See you tonight.
Caller: Great, thanks.
Agent: Thanks for calling.',
 'Caller booked a table for {PARTY} at {TIME} under {NAME}. Reservation confirmed and phone number captured from caller ID.',
 'positive','create_reservation','resolved',
 '["Party of {PARTY}","Requested {TIME}","Booked under {NAME}"]'::jsonb,
 '["Reservation created in the book"]'::jsonb),

('reserve_big',
'Agent: Harbor House Kitchen, how can I help?
Caller: I need a table for a big group, {PARTYW} people.
Agent: What day and time?
Caller: Saturday around {TIME}.
Agent: That works in the back room at {TIME}. Any high chairs or accessibility needs?
Caller: One high chair.
Agent: Noted. What name is it under?
Caller: {NAME}.
Agent: Parties over eight have a set menu — I''ll have someone email it to you today. Anything else?
Caller: No, that''s it.
Agent: You''re down for {PARTYW} at {TIME}, {NAME}. See you Saturday.',
 'Large-party booking for {PARTY} at {TIME} under {NAME}. One high chair requested. Set-menu email flagged for the manager.',
 'positive','create_reservation','resolved',
 '["Large party of {PARTY}","One high chair","Set menu applies over eight guests"]'::jsonb,
 '["Reservation created","Manager to email the set menu"]'::jsonb),

('modify',
'Agent: Harbor House Kitchen.
Caller: I have a booking tonight and I need to change the number of people.
Agent: What name is it under?
Caller: {NAME}.
Agent: I have you at {TIME}. What should the party be?
Caller: Make it {PARTYW} now.
Agent: Updated to {PARTYW} at {TIME}. Same table section, slightly later seating is possible if you need it.
Caller: No, that time is fine.
Agent: You''re set for {PARTYW} at {TIME}. See you tonight.',
 'Existing reservation for {NAME} at {TIME} updated to a party of {PARTY}. No time change requested.',
 'neutral','modify_reservation','resolved',
 '["Existing booking located by name","Party size changed to {PARTY}","Time unchanged at {TIME}"]'::jsonb,
 '["Reservation updated"]'::jsonb),

('cancel',
'Agent: Harbor House Kitchen.
Caller: I need to cancel my reservation for tonight.
Agent: What name is it under?
Caller: {NAME}.
Agent: I have {PARTYW} at {TIME}. Cancelling that now.
Caller: Sorry about the short notice.
Agent: No problem at all. Cancelled — hope to see you another time.',
 'Reservation for {NAME}, party of {PARTY} at {TIME}, cancelled at the caller''s request. Table released.',
 'neutral','cancel_reservation','resolved',
 '["Cancellation requested same day","Booking found under {NAME}","Table released"]'::jsonb,
 '["Reservation cancelled"]'::jsonb),

('takeout',
'Agent: Harbor House Kitchen.
Caller: I''d like to place a pickup order.
Agent: Go ahead.
Caller: A large pepperoni pizza and an order of garlic knots.
Agent: Anything to drink?
Caller: Two lemonades.
Agent: That''s {TOTAL}. What name for the order?
Caller: {NAME}.
Agent: Ready in about twenty minutes, {NAME}. See you shortly.',
 'Pickup order placed by {NAME} totalling {TOTAL}. Quoted a twenty minute pickup window.',
 'positive','submit_order','resolved',
 '["Pickup order","Total {TOTAL}","Twenty minute quote"]'::jsonb,
 '["Order sent to the kitchen"]'::jsonb),

('delivery',
'Agent: Harbor House Kitchen.
Caller: Do you deliver to the Southside?
Agent: We do. What''s the address?
Caller: 4412 Everhart Road, apartment eleven.
Agent: Got it. What would you like?
Caller: Two orders of fish and chips, a Caesar, and a chocolate cake.
Agent: Anything to drink?
Caller: No, that''s everything.
Agent: That''s {TOTAL}, about forty minutes. What name?
Caller: {NAME}.
Agent: On its way to Everhart in about forty minutes, {NAME}. Thanks.',
 'Delivery order to 4412 Everhart Road for {NAME}, {TOTAL}. Forty minute delivery window quoted.',
 'positive','submit_order','resolved',
 '["Delivery to 4412 Everhart Road","Total {TOTAL}","Forty minute quote"]'::jsonb,
 '["Order sent to the kitchen","Driver dispatch queued"]'::jsonb),

('hours',
'Agent: Harbor House Kitchen.
Caller: What time do you close tonight?
Agent: Ten tonight, last kitchen order at nine thirty.
Caller: And Sundays?
Agent: Nine, same last order half an hour before. Anything else?
Caller: That''s all, thanks.
Agent: Have a good one.',
 'Caller asked closing times. Given ten tonight and nine on Sunday, with last kitchen orders thirty minutes prior. No booking made.',
 'neutral','no_action_taken','informational',
 '["Asked about closing time","Given weekday and Sunday hours"]'::jsonb,
 '[]'::jsonb),

('menu',
'Agent: Harbor House Kitchen.
Caller: What''s on the menu tonight?
Agent: Coastal American — raw bar, wood-fired pizza, house pasta, and grill and seafood mains.
Caller: Anything vegetarian?
Agent: Margherita and garden pizzas, cacio e pepe, and penne primavera, which is vegan.
Caller: Perfect, I''ll come by.
Agent: See you tonight.',
 'Menu enquiry. Caller asked about vegetarian options and was given the vegetarian and vegan dishes. Intends to walk in.',
 'positive','get_menu','informational',
 '["General menu enquiry","Vegetarian and vegan options given"]'::jsonb,
 '[]'::jsonb),

('allergen',
'Agent: Harbor House Kitchen.
Caller: My daughter has a severe shellfish allergy. Is that manageable?
Agent: Yes. Our fryer is shared, so I''d avoid the fried items — the grilled salmon, roast chicken, and steak frites are all clear.
Caller: What about the pizzas?
Agent: All clear except the white clam. I''ll flag the allergy on the booking so the kitchen is told directly.
Caller: Thank you, that helps.
Agent: What name should I put the note under?
Caller: {NAME}.
Agent: Flagged for {NAME}. See you soon.',
 'Shellfish allergy enquiry for {NAME}. Shared fryer disclosed, safe dishes identified, allergy flagged to the kitchen.',
 'positive','check_allergens','resolved',
 '["Severe shellfish allergy","Shared fryer disclosed","Safe dishes identified"]'::jsonb,
 '["Allergy note attached for the kitchen"]'::jsonb),

('wait',
'Agent: Harbor House Kitchen.
Caller: How long is the wait right now?
Agent: About thirty five minutes for {PARTYW}.
Caller: Can you put us down?
Agent: Sure. What name?
Caller: {NAME}.
Agent: You''re on the list, {NAME}. We''ll call this number when the table''s ready.',
 'Walk-in wait enquiry. Quoted thirty five minutes for {PARTY} and added {NAME} to the waitlist with a callback number.',
 'neutral','get_wait_time','resolved',
 '["Thirty five minute quote","Party of {PARTY}","Added to waitlist"]'::jsonb,
 '["Waitlist entry created","Callback number saved"]'::jsonb),

('catering',
'Agent: Harbor House Kitchen.
Caller: I''m organising a company lunch and wanted to ask about catering.
Agent: Sure. How many people?
Caller: About {PARTYW}.
Agent: And the date?
Caller: The fourteenth of next month.
Agent: On site or delivered?
Caller: Delivered to our office downtown.
Agent: Any dietary requirements?
Caller: Two vegetarian, one gluten free.
Agent: Got it. Best name and email for the quote?
Caller: {NAME}, and I''ll spell the email for you.
Agent: Go ahead.
Caller: First initial, then my last name, at bayfrontlogistics dot com.
Agent: Our events manager will send a quote within one business day. Thanks for calling.',
 'Catering enquiry from {NAME} for roughly {PARTY} guests, delivered downtown on the fourteenth. Two vegetarian and one gluten-free. Passed to the events manager for a quote.',
 'positive','escalated_to_human','escalated',
 '["Approximately {PARTY} guests","Delivered downtown","Two vegetarian, one gluten free"]'::jsonb,
 '["Catering lead created","Events manager to quote within one business day"]'::jsonb),

('complaint',
'Agent: Harbor House Kitchen.
Caller: We ate there last night and the food came out cold.
Agent: Sorry about that. Which dishes?
Caller: Two pastas. We told the server and nothing happened.
Agent: Understood. What name was the table under?
Caller: {NAME}.
Agent: I have your table. I''m passing this to the general manager tonight and she''ll call you back on this number.
Caller: I''d appreciate that.
Agent: You''ll hear from her today. Sorry again.',
 'Service complaint from {NAME}: two pasta dishes served cold and the issue was not addressed at the table. Escalated to the general manager for a same-day callback.',
 'negative','escalated_to_human','escalated',
 '["Two pasta dishes served cold","Issue not resolved at the table","Callback requested"]'::jsonb,
 '["Complaint logged","General manager to call back today"]'::jsonb),

('ob_confirm',
'Agent: Hi, this is Harbor House Kitchen calling to confirm your table for {PARTYW} at {TIME}.
Caller: Yes, we''ll be there.
Agent: Great. Any changes to the party size?
Caller: No, same.
Agent: Confirmed for {TIME}. See you then.',
 'Outbound confirmation call for {NAME}''s reservation, party of {PARTY} at {TIME}. Guest confirmed, no changes.',
 'positive','create_reservation','resolved',
 '["Guest confirmed attendance","Party size unchanged at {PARTY}"]'::jsonb,
 '["Reservation marked confirmed"]'::jsonb),

('ob_waitlist',
'Agent: Hi, Harbor House Kitchen — your table for {PARTYW} is ready.
Caller: Oh, we stepped down the block. Five minutes?
Agent: We''ll hold it ten. Ask for {NAME} at the host stand.
Caller: Thanks, on our way.
Agent: See you shortly.',
 'Outbound waitlist callback to {NAME}. Table for {PARTY} ready and held for ten minutes.',
 'positive','get_wait_time','resolved',
 '["Table ready","Held ten minutes","Guest en route"]'::jsonb,
 '["Waitlist entry marked notified"]'::jsonb);

INSERT INTO call_transcripts (id, call_id, tenant_id, content, segments, language, provider, is_redacted, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '02' || lpad(c.n::text, 4, '0'))::uuid,
  c.call_id,
  :tenant::uuid,
  replace(replace(replace(replace(t.body,
    '{NAME}',  c.person), '{PARTYW}', c.partyw), '{TIME}', c.tm), '{TOTAL}', c.total),
  NULL,
  'en',
  'ultravox',
  false,
  c.ended_at
FROM _calls c
JOIN _tmpl t ON t.kind = c.kind
WHERE c.st = 'completed'
ON CONFLICT (id) DO NOTHING;

-- ── call_summaries ──────────────────────────────────────────────────────────
INSERT INTO call_summaries (id, call_id, tenant_id, summary, key_points, action_items, sentiment, model, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '03' || lpad(c.n::text, 4, '0'))::uuid,
  c.call_id,
  :tenant::uuid,
  replace(replace(replace(replace(t.summary,
    '{NAME}', c.person), '{PARTY}', c.party), '{TIME}', c.tm), '{TOTAL}', c.total),
  replace(replace(t.key_points::text, '{PARTY}', c.party), '{TOTAL}', c.total)::jsonb,
  t.actions,
  t.sentiment,
  'ultravox',
  c.ended_at
FROM _calls c
JOIN _tmpl t ON t.kind = c.kind
WHERE c.st = 'completed'
ON CONFLICT (id) DO NOTHING;

-- ── call_outcomes ───────────────────────────────────────────────────────────
INSERT INTO call_outcomes (id, call_id, tenant_id, outcome_type, disposition, notes, follow_up_at, metadata, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '04' || lpad(c.n::text, 4, '0'))::uuid,
  c.call_id,
  :tenant::uuid,
  t.outcome,
  t.disposition,
  replace(replace(replace(t.summary, '{NAME}', c.person), '{PARTY}', c.party), '{TOTAL}', c.total),
  CASE WHEN t.disposition = 'escalated' THEN c.ended_at + interval '4 hours' END,
  jsonb_build_object('channel', 'voice', 'industry', 'restaurant', 'kind', c.kind),
  c.ended_at
FROM _calls c
JOIN _tmpl t ON t.kind = c.kind
WHERE c.st = 'completed'
ON CONFLICT (id) DO NOTHING;

-- Unanswered calls still deserve an outcome row, otherwise the call detail
-- page for a missed call is completely blank.
INSERT INTO call_outcomes (id, call_id, tenant_id, outcome_type, disposition, notes, metadata, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '04' || lpad(c.n::text, 4, '0'))::uuid,
  c.call_id,
  :tenant::uuid,
  'no_action_taken',
  CASE WHEN c.st = 'failed' THEN 'unresolved' ELSE 'attempted' END,
  CASE c.st
    WHEN 'no_answer' THEN 'Ring-out with no answer. No voicemail left.'
    WHEN 'busy'      THEN 'Line busy — caller received an engaged tone.'
    ELSE 'Outbound attempt failed before connecting to the carrier.'
  END,
  jsonb_build_object('channel', 'voice', 'industry', 'restaurant', 'kind', c.kind),
  c.started_at
FROM _calls c
WHERE c.st <> 'completed'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EVALUATIONS
--
-- A believable spread, not a wall of 99s: the mean sits in the mid-eighties
-- with a genuine tail. Complaints and catering calls score lowest because
-- they end in an escalation the agent could not close itself; short factual
-- calls score highest. The three sub-70 rows are deliberate — a demo where
-- every call is near-perfect reads as fake and invites the obvious question.
-- ============================================================================
INSERT INTO call_evaluations (id, call_id, tenant_id, evaluator, score, max_score, criteria, feedback, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '05' || lpad(c.n::text, 4, '0'))::uuid,
  c.call_id,
  :tenant::uuid,
  'automated-v1',
  sc.score,
  100,
  jsonb_build_object(
    'task_completion',  LEAST(100, sc.score + 4),
    'brevity',          GREATEST(40, sc.score - 3),
    'one_question_rule',GREATEST(45, sc.score - 1),
    'no_padding',       LEAST(100, sc.score + 2),
    'agent_closed_call',CASE WHEN sc.score >= 75 THEN 100 ELSE 55 END
  ),
  sc.feedback,
  c.ended_at + interval '2 minutes'
FROM _calls c
JOIN LATERAL (
  SELECT
    -- Deterministic pseudo-jitter from the call number so re-runs are stable.
    CASE c.kind
      WHEN 'complaint'  THEN 62 + (c.n % 7)
      WHEN 'catering'   THEN 68 + (c.n % 6)
      WHEN 'reserve_big'THEN 74 + (c.n % 8)
      WHEN 'modify'     THEN 79 + (c.n % 9)
      WHEN 'cancel'     THEN 84 + (c.n % 8)
      WHEN 'delivery'   THEN 80 + (c.n % 11)
      WHEN 'takeout'    THEN 83 + (c.n % 12)
      WHEN 'allergen'   THEN 86 + (c.n % 9)
      WHEN 'reserve'    THEN 85 + (c.n % 13)
      WHEN 'wait'       THEN 88 + (c.n % 9)
      WHEN 'menu'       THEN 89 + (c.n % 8)
      WHEN 'hours'      THEN 90 + (c.n % 8)
      ELSE 87 + (c.n % 10)
    END::real AS score,
    CASE c.kind
      WHEN 'complaint'  THEN 'Escalated correctly and stayed calm, but took four turns to identify the booking and repeated the apology three times.'
      WHEN 'catering'   THEN 'Captured every field the events manager needs. Stacked two questions in one turn when asking date and headcount.'
      WHEN 'reserve_big'THEN 'Good handling of the set-menu policy. Volunteered it slightly earlier than necessary.'
      WHEN 'modify'     THEN 'Found the booking on the first try. Offering a later seating was unprompted and slightly padded the call.'
      WHEN 'cancel'     THEN 'Clean and fast. Released the table without an unnecessary retention attempt.'
      WHEN 'delivery'   THEN 'Address captured accurately and total quoted once. Could have skipped the drinks upsell for a caller in a hurry.'
      WHEN 'takeout'    THEN 'Order taken in four turns with no read-back. Quote and name captured in a single turn.'
      WHEN 'allergen'   THEN 'Disclosed the shared fryer without being asked, which is the correct call. Clear, safe, and appropriately serious.'
      WHEN 'reserve'    THEN 'Textbook booking: one question per turn, confirmation folded into the next question, agent closed the call.'
      WHEN 'wait'       THEN 'Quoted, offered the list, captured the name. Nothing wasted.'
      WHEN 'menu'       THEN 'Concise menu description without reciting the whole card. Answered the vegetarian follow-up precisely.'
      WHEN 'hours'      THEN 'Two facts, two sentences, clean sign-off. Ideal length for the question asked.'
      ELSE 'Task completed within the expected number of turns.'
    END AS feedback
) sc ON true
WHERE c.st = 'completed'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TOOL RUNS
--
-- Tool names are restricted to the restaurant set that
-- src/lib/calls/tool-descriptions.ts knows how to render in plain English —
-- an unrecognised name shows as a raw identifier on the call detail page.
-- ============================================================================
CREATE TEMP TABLE _toolspec (
  kind TEXT NOT NULL,
  seq  INT  NOT NULL,
  tool TEXT NOT NULL,
  st   TEXT NOT NULL,
  ms   INT  NOT NULL,
  PRIMARY KEY (kind, seq)
) ON COMMIT DROP;

INSERT INTO _toolspec (kind, seq, tool, st, ms) VALUES
 ('reserve'    ,1,'check_table_availability','success',312),
 ('reserve'    ,2,'create_reservation'      ,'success',408),
 ('reserve_big',1,'check_table_availability','success',377),
 ('reserve_big',2,'create_reservation'      ,'success',455),
 ('modify'     ,1,'check_table_availability','success',298),
 ('modify'     ,2,'modify_reservation'      ,'success',389),
 ('cancel'     ,1,'cancel_reservation'      ,'success',271),
 ('takeout'    ,1,'get_menu'                ,'success',188),
 ('takeout'    ,2,'submit_order'            ,'success',512),
 ('delivery'   ,1,'get_menu'                ,'success',194),
 ('delivery'   ,2,'submit_order'            ,'success',548),
 ('menu'       ,1,'get_menu'                ,'success',176),
 ('allergen'   ,1,'get_menu'                ,'success',181),
 ('allergen'   ,2,'check_allergens'         ,'success',263),
 ('wait'       ,1,'get_wait_time'           ,'success',142),
 ('catering'   ,1,'transfer_call'           ,'success',631),
 ('complaint'  ,1,'transfer_call'           ,'success',604),
 ('ob_confirm' ,1,'modify_reservation'      ,'success',344),
 ('ob_waitlist',1,'get_wait_time'           ,'success',138);

INSERT INTO call_tool_runs (id, call_id, tool_name, input, output, status, duration_ms, error_message, started_at, completed_at, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '06' || lpad((c.n * 10 + ts.seq)::text, 4, '0'))::uuid,
  c.call_id,
  ts.tool,
  jsonb_build_object(
    'party_size',   c.party,
    'requested_at', c.tm,
    'guest_name',   c.person,
    'guest_phone',  c.phone
  ),
  jsonb_build_object('ok', true, 'summary', ts.tool || ' completed'),
  ts.st,
  ts.ms,
  NULL,
  c.started_at + ((20 + ts.seq * 15) || ' seconds')::interval,
  c.started_at + ((20 + ts.seq * 15) || ' seconds')::interval + (ts.ms || ' milliseconds')::interval,
  c.started_at
FROM _calls c
JOIN _toolspec ts ON ts.kind = c.kind
WHERE c.st = 'completed'
ON CONFLICT (id) DO NOTHING;

-- One genuine tool failure, so the detail page's error path is demonstrable
-- rather than theoretical.
UPDATE call_tool_runs
SET status = 'error',
    output = jsonb_build_object('ok', false, 'reason', 'no_tables_at_requested_time'),
    error_message = 'No table for 6 available within 30 minutes of the requested time.'
WHERE id = ('e0000000-0000-4000-8000-000000' || '06' || lpad((57 * 10 + 1)::text, 4, '0'))::uuid;

-- ── call_events ─────────────────────────────────────────────────────────────
INSERT INTO call_events (id, call_id, event_type, timestamp, data, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '07' || lpad((c.n * 10 + e.seq)::text, 4, '0'))::uuid,
  c.call_id,
  e.ev,
  c.started_at + (e.offs || ' seconds')::interval,
  e.payload,
  c.started_at
FROM _calls c
CROSS JOIN LATERAL (
  SELECT 1 AS seq, 'call_started'::text AS ev, 0 AS offs,
         jsonb_build_object('from', c.phone, 'direction', c.dir) AS payload
  UNION ALL
  SELECT 2, 'agent_greeting', 2,
         jsonb_build_object('greeting', 'Harbor House Kitchen')
  UNION ALL
  SELECT 3, 'call_ended', COALESCE(c.dur, 0),
         jsonb_build_object('reason',
           CASE c.st WHEN 'completed' THEN 'agent_hangup' ELSE c.st END)
) e
ON CONFLICT (id) DO NOTHING;

-- Escalation events only where the agent actually handed off.
INSERT INTO call_events (id, call_id, event_type, timestamp, data, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '07' || lpad((c.n * 10 + 4)::text, 4, '0'))::uuid,
  c.call_id,
  'escalation',
  c.started_at + ((COALESCE(c.dur, 60) - 20) || ' seconds')::interval,
  jsonb_build_object(
    'reason', CASE c.kind WHEN 'complaint' THEN 'service_complaint' ELSE 'catering_enquiry' END,
    'target', CASE c.kind WHEN 'complaint' THEN 'general_manager' ELSE 'events_manager' END
  ),
  c.started_at
FROM _calls c
WHERE c.kind IN ('complaint', 'catering') AND c.st = 'completed'
ON CONFLICT (id) DO NOTHING;

-- ── call_participants ───────────────────────────────────────────────────────
INSERT INTO call_participants (id, call_id, role, phone_number, display_name, joined_at, left_at, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '08' || lpad((c.n * 10 + p.seq)::text, 4, '0'))::uuid,
  c.call_id, p.role, p.num, p.nm, c.started_at, c.ended_at, c.started_at
FROM _calls c
CROSS JOIN LATERAL (
  SELECT 1 AS seq, 'agent'::text AS role,
         :twilio::text AS num, 'Harbor House Kitchen AI'::text AS nm
  UNION ALL
  SELECT 2, 'caller', c.phone, c.person
) p
ON CONFLICT (id) DO NOTHING;

-- ── call_costs ──────────────────────────────────────────────────────────────
-- Realistic unit economics so the Usage and Analytics cost tiles are credible:
-- roughly $0.0085/min telephony, $0.0043/min STT, $0.0150/min TTS, and an
-- LLM cost that scales with turn count rather than wall-clock time.
INSERT INTO call_costs (id, call_id, tenant_id, telephony_cost, stt_cost, tts_cost, llm_cost, total_cost, currency, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '09' || lpad(c.n::text, 4, '0'))::uuid,
  c.call_id,
  :tenant::uuid,
  ROUND((c.dur / 60.0 * 0.0085)::numeric, 4),
  ROUND((c.dur / 60.0 * 0.0043)::numeric, 4),
  ROUND((c.dur / 60.0 * 0.0150)::numeric, 4),
  ROUND((c.dur / 60.0 * 0.0210)::numeric, 4),
  ROUND((c.dur / 60.0 * 0.0488)::numeric, 4),
  'USD',
  c.ended_at
FROM _calls c
WHERE c.st = 'completed'
ON CONFLICT (id) DO NOTHING;

-- ── recording_consents ──────────────────────────────────────────────────────
INSERT INTO recording_consents (id, call_id, tenant_id, consented, method, timestamp, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '21' || lpad(c.n::text, 4, '0'))::uuid,
  c.call_id, :tenant::uuid, true, 'verbal',
  c.started_at + interval '3 seconds', c.started_at
FROM _calls c
WHERE c.st = 'completed' AND c.dir = 'inbound'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RESERVATIONS
--
-- The Operations tab shows reservations with scheduled_at >= now() - 12 hours
-- and status <> 'cancelled', ordered soonest first. Rows 1-14 are therefore
-- deliberately in the FUTURE (tonight through nine days out) so that panel is
-- populated at any hour of the day the demo happens to run. Rows 15-25 sit in
-- the past to give the history and the cancelled/no-show statuses something
-- to show. Times are anchored to date_trunc('day', now()) so a reservation is
-- always at a plausible dinner hour, never 3am.
-- ============================================================================
INSERT INTO reservations (
  id, tenant_id, call_id, guest_name, guest_phone, guest_email, party_size,
  scheduled_at, duration_minutes, status, special_requests,
  confirmed_at, cancelled_at, no_show_at, created_at, updated_at
)
SELECT
  ('e0000000-0000-4000-8000-000000' || '10' || lpad(r.rn::text, 4, '0'))::uuid,
  :tenant::uuid,
  lk.call_ref,
  r.nm, r.ph, r.em, r.psize,
  date_trunc('day', now()) + (r.day_off || ' days')::interval + (r.hh || ' hours')::interval + (r.mm || ' minutes')::interval,
  r.mins, r.status, r.req,
  CASE WHEN r.status IN ('confirmed','seated','completed') THEN now() - (r.rn || ' hours')::interval END,
  CASE WHEN r.status = 'cancelled' THEN now() - (r.rn || ' hours')::interval END,
  CASE WHEN r.status = 'no_show'   THEN now() - (r.rn || ' hours')::interval END,
  now() - ((r.rn * 7) || ' hours')::interval,
  now() - ((r.rn * 7) || ' hours')::interval
FROM (VALUES
  ( 1,'Solange Pitre'      ,'+13615548651','solange.pitre@example.com'   ,4, 0,19,30,90,'confirmed','Window table if possible'),
  ( 2,'Emory Lafitte'      ,'+13615548324','emory.lafitte@example.com'   ,4, 0,19,45,90,'confirmed',NULL),
  ( 3,'Juliette Sonnier'   ,'+13615548091',NULL                          ,3, 0,20,15,90,'confirmed','Anniversary — dessert candle'),
  ( 4,'Odessa Kimbrough'   ,'+13615547875','odessa.k@example.com'        ,2, 1,19, 0,90,'confirmed',NULL),
  ( 5,'Marguerite Doiron'  ,'+13615547659',NULL                          ,4, 1,18,30,90,'confirmed','High chair needed'),
  ( 6,'Leticia Marchand'   ,'+13615547327','l.marchand@example.com'      ,6, 1,19,30,120,'confirmed','Back room if free'),
  ( 7,'Desmond Fontenot'   ,'+13615547093',NULL                          ,4, 2,18, 0,90,'confirmed',NULL),
  ( 8,'Antonia Villagomez' ,'+13615546766','a.villagomez@example.com'    ,5, 2,19,30,90,'confirmed','One vegetarian'),
  ( 9,'Lamar Whitfield'    ,'+13615546439',NULL                          ,2, 3,18,30,90,'confirmed',NULL),
  (10,'Josefina Rendon'    ,'+13615546095','j.rendon@example.com'        ,3, 3,19, 0,90,'confirmed',NULL),
  (11,'Adela Carbajal'     ,'+13615545879',NULL                          ,2, 4,17,30,90,'confirmed',NULL),
  (12,'Constance Ybarra'   ,'+13615545437','c.ybarra@example.com'        ,6, 5,19,30,120,'confirmed','Birthday, quiet corner'),
  (13,'Bianca Zamarripa'   ,'+13615545106',NULL                          ,4, 6,18, 0,90,'confirmed',NULL),
  (14,'Ofelia Mendiola'    ,'+13615541322','o.mendiola@example.com'      ,12,9,18, 0,150,'confirmed','Set menu, one high chair'),
  (15,'Genevieve Alaniz'   ,'+13615544767',NULL                          ,2,-1,19,30,90,'completed',NULL),
  (16,'Rosalind Chapa'     ,'+13615544548','r.chapa@example.com'         ,3,-2,18,30,90,'completed',NULL),
  (17,'Franklin Doucette'  ,'+13615544215',NULL                          ,4,-3,19, 0,90,'cancelled','Cancelled same day'),
  (18,'Louisa Pellerin'    ,'+13615543982',NULL                          ,2,-4,18, 0,90,'completed',NULL),
  (19,'Gwendolyn Mabry'    ,'+13615543327','g.mabry@example.com'         ,2,-5,17,30,90,'no_show',NULL),
  (20,'Alonzo Hinojosa'    ,'+13615542987',NULL                          ,5,-6,19, 0,90,'completed','Allergy: shellfish'),
  (21,'Ike Sandoval'       ,'+13615542651',NULL                          ,3,-7,18, 0,90,'completed',NULL),
  (22,'Delia Portillo'     ,'+13615542324','d.portillo@example.com'      ,2,-8,19,30,90,'completed',NULL),
  (23,'Camille Arceneaux'  ,'+13615541983',NULL                          ,4,-9,18,30,90,'completed',NULL),
  (24,'Peter Nakamura'     ,'+13615541659','p.nakamura@example.com'      ,2,-10,19, 0,90,'completed',NULL),
  (25,'Katherine Salinas'  ,'+13615541103',NULL                          ,2,-11,17,30,90,'cancelled',NULL)
) AS r(rn, nm, ph, em, psize, day_off, hh, mm, mins, status, req)
LEFT JOIN LATERAL (
  SELECT c.call_id AS call_ref FROM _calls c
  WHERE c.phone = r.ph AND c.kind IN ('reserve','reserve_big','modify')
  ORDER BY c.started_at DESC LIMIT 1
) lk ON true
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORDERS
--
-- Operations shows the ten most recent orders by created_at, with no status
-- filter, so the newest rows carry live kitchen statuses (pending, preparing,
-- ready) and an estimated_ready_at in the near future. Older rows are
-- completed.
--
-- Totals are NOT hardcoded. Line items are priced by joining the real
-- menu_items seeded by demo-seed-menu.sql, then subtotal/tax/total are
-- computed from those lines below. Hand-typed totals drift the moment a menu
-- price changes, and a demo where the arithmetic visibly does not add up is
-- worse than no demo.
-- ============================================================================
INSERT INTO orders (
  id, tenant_id, call_id, order_number, order_type, status,
  customer_name, customer_phone, subtotal_cents, tax_cents, tip_cents,
  total_cents, currency, special_instructions, estimated_ready_at,
  completed_at, created_at, updated_at
)
SELECT
  ('e0000000-0000-4000-8000-000000' || '11' || lpad(o.rn::text, 4, '0'))::uuid,
  :tenant::uuid,
  lk.call_ref,
  'HH-' || (1000 + o.rn)::text,
  o.otype,
  o.status,
  o.nm, o.ph,
  0, 0, o.tip, 0, 'USD',
  o.notes,
  CASE WHEN o.status IN ('pending','preparing','ready')
       THEN now() + ((o.rn * 6) || ' minutes')::interval END,
  CASE WHEN o.status IN ('completed','delivered')
       THEN now() - ((o.mins_ago - 25) || ' minutes')::interval END,
  now() - (o.mins_ago || ' minutes')::interval,
  now() - (o.mins_ago || ' minutes')::interval
FROM (VALUES
  ( 1,'takeout' ,'pending'  ,'Nell Fauntleroy'   ,'+13615548879',    0,   14,'Extra napkins'),
  ( 2,'delivery','preparing','Casey Boudreaux'   ,'+13615547767',  900,   38,'Leave at the door'),
  ( 3,'takeout' ,'preparing','Rowan Thibodaux'   ,'+13615548549',    0,   52,NULL),
  ( 4,'takeout' ,'ready'    ,'Barrett Coleman'   ,'+13615548107',  600,   71,NULL),
  ( 5,'delivery','ready'    ,'Garrett Naquin'    ,'+13615547219', 1000,   96,'Apartment 3B, buzzer broken'),
  ( 6,'takeout' ,'completed','Alvin Prudhomme'   ,'+13615547548',  500,  180,NULL),
  ( 7,'delivery','delivered','Serena Broussard'  ,'+13615546324', 1200,  320,NULL),
  ( 8,'takeout' ,'completed','Ramona Elizondo'   ,'+13615546982',  700,  480,'No onions'),
  ( 9,'takeout' ,'completed','Paloma Iturralde'  ,'+13615546547',    0,  760,NULL),
  (10,'delivery','delivered','Tamara Vasquez'    ,'+13615544983', 1400, 1180,'Ring twice'),
  (11,'takeout' ,'completed','Harlan Bergeron'   ,'+13615545214',  400, 1520,NULL),
  (12,'delivery','delivered','Yvette Landreneau' ,'+13615545651', 1100, 1900,NULL),
  (13,'takeout' ,'completed','Winston Melancon'  ,'+13615545987',  900, 2280,NULL),
  (14,'takeout' ,'completed','Oscar Benavides'   ,'+13615544659',  600, 2760,NULL),
  (15,'delivery','delivered','Damon Krautkramer' ,'+13615544093', 1300, 3240,'Gate code 4417'),
  (16,'takeout' ,'completed','Beatriz Quintanilla','+13615544107',   0, 3720,NULL),
  (17,'takeout' ,'completed','Charmaine Robicheaux','+13615543547',800,4200,NULL),
  (18,'delivery','delivered','Ruben Ontiveros'   ,'+13615543219', 1200, 4680,NULL),
  (19,'takeout' ,'completed','Nadine Broussard'  ,'+13615542768',  500, 5160,NULL),
  (20,'delivery','delivered','Jarrod Pemberton'  ,'+13615542437', 1000, 5640,NULL),
  (21,'takeout' ,'completed','Emmett Lonergan'   ,'+13615542216',    0, 6120,NULL),
  (22,'takeout' ,'completed','Deandra Whitlock'  ,'+13615541761',  900, 6600,'Extra tartar sauce'),
  (23,'delivery','delivered','Brandon Shackleford','+13615541436',1500, 7080,NULL),
  (24,'takeout' ,'completed','Rosalie Fontenot'  ,'+13615540981',  400, 7560,NULL),
  (25,'delivery','delivered','Anita Bustamante'  ,'+13615540544', 1200, 8040,NULL)
) AS o(rn, otype, status, nm, ph, tip, mins_ago, notes)
LEFT JOIN LATERAL (
  SELECT c.call_id AS call_ref FROM _calls c
  WHERE c.phone = o.ph AND c.kind IN ('takeout','delivery')
  ORDER BY c.started_at DESC LIMIT 1
) lk ON true
ON CONFLICT (id) DO NOTHING;

-- ── order_items ─────────────────────────────────────────────────────────────
-- name and unit_price_cents come from menu_items rather than being retyped,
-- so a menu price change flows through to the seeded totals on the next run.
INSERT INTO order_items (id, order_id, menu_item_id, name, quantity, unit_price_cents, modifiers, special_instructions, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '12' || lpad((li.ord * 10 + li.seq)::text, 4, '0'))::uuid,
  ('e0000000-0000-4000-8000-000000' || '11' || lpad(li.ord::text, 4, '0'))::uuid,
  mi.id,
  mi.name,
  li.qty,
  mi.price_cents,
  NULL,
  NULL,
  now()
FROM (VALUES
  -- order, seq, menu item suffix, qty
  ( 1,1,'211',1),( 1,2,'202',1),( 1,3,'252',2),
  ( 2,1,'233',2),( 2,2,'205',1),( 2,3,'242',1),
  ( 3,1,'234',1),( 3,2,'251',1),
  ( 4,1,'213',1),( 4,2,'203',1),( 4,3,'254',2),
  ( 5,1,'222',2),( 5,2,'206',1),( 5,3,'241',2),
  ( 6,1,'212',1),( 6,2,'201',1),
  ( 7,1,'235',2),( 7,2,'204',1),( 7,3,'256',2),
  ( 8,1,'224',1),( 8,2,'202',1),( 8,3,'253',2),
  ( 9,1,'233',1),( 9,2,'251',1),
  (10,1,'237',2),(10,2,'231',1),(10,3,'255',2),(10,4,'244',1),
  (11,1,'223',1),(11,2,'251',1),
  (12,1,'232',1),(12,2,'221',1),(12,3,'243',1),
  (13,1,'211',2),(13,2,'206',1),(13,3,'252',2),
  (14,1,'214',1),(14,2,'205',1),(14,3,'253',1),
  (15,1,'236',1),(15,2,'222',1),(15,3,'242',2),
  (16,1,'225',1),(16,2,'257',1),
  (17,1,'213',1),(17,2,'203',1),(17,3,'254',1),
  (18,1,'234',2),(18,2,'201',1),(18,3,'251',2),
  (19,1,'215',1),(19,2,'206',1),(19,3,'252',1),
  (20,1,'232',1),(20,2,'233',1),(20,3,'244',1),
  (21,1,'212',1),(21,2,'253',1),
  (22,1,'233',2),(22,2,'202',1),(22,3,'255',1),
  (23,1,'237',1),(23,2,'235',1),(23,3,'204',1),(23,4,'256',2),
  (24,1,'223',1),(24,2,'251',1),
  (25,1,'224',1),(25,2,'221',1),(25,3,'205',1),(25,4,'241',1)
) AS li(ord, seq, item, qty)
JOIN menu_items mi
  ON mi.id = ('d0000000-0000-4000-8000-000000000' || li.item)::uuid
ON CONFLICT (id) DO NOTHING;

-- ── recompute order money from the actual line items ────────────────────────
-- Texas state + Corpus Christi local sales tax, 8.25%. Recomputed on every run
-- rather than stored as literals, so the arithmetic on screen always adds up.
UPDATE orders o
SET subtotal_cents = t.sub,
    tax_cents      = ROUND(t.sub * 0.0825),
    total_cents    = t.sub + ROUND(t.sub * 0.0825) + o.tip_cents
FROM (
  SELECT oi.order_id, SUM(oi.quantity * oi.unit_price_cents)::int AS sub
  FROM order_items oi
  WHERE oi.id::text LIKE 'e0000000-0000-4000-8000-00000012%'
  GROUP BY oi.order_id
) t
WHERE o.id = t.order_id;

-- ============================================================================
-- CONTACTS — the phone book behind Contacts and outbound dialling.
-- call_count and last_contacted_at are derived from the seeded calls where a
-- matching number exists, so the contact record agrees with call history
-- instead of asserting numbers nothing backs up.
-- ============================================================================
INSERT INTO contacts (
  id, tenant_id, name, phone, email, company, notes, tags, source,
  first_contacted_at, last_contacted_at, call_count, do_not_call,
  created_at, updated_at
)
SELECT
  ('e0000000-0000-4000-8000-000000' || '13' || lpad(k.rn::text, 4, '0'))::uuid,
  :tenant::uuid,
  k.nm, k.ph, k.em, k.co, k.notes, k.tags, k.src,
  COALESCE(agg.first_at, now() - ((k.rn * 30) || ' days')::interval),
  agg.last_at,
  COALESCE(agg.cnt, 0),
  k.dnc,
  COALESCE(agg.first_at, now() - ((k.rn * 30) || ' days')::interval),
  now()
FROM (VALUES
  ( 1,'Marisol Trevino'     ,'+13615540118','marisol.trevino@example.com'  ,NULL                    ,'Regular — prefers window tables' ,'{regular,reservations}'::text[]      ,'inbound_call' ,false),
  ( 2,'Dale Kowalczyk'      ,'+13615540219',NULL                           ,NULL                    ,NULL                              ,'{takeout}'::text[]                   ,'inbound_call' ,false),
  ( 3,'Bernice Ochoa'       ,'+13615540327',NULL                           ,NULL                    ,NULL                              ,'{}'::text[]                          ,'inbound_call' ,false),
  ( 4,'Cody Villarreal'     ,'+13615540431',NULL                           ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  ( 5,'Anita Bustamante'    ,'+13615540544','anita.b@example.com'          ,NULL                    ,'Delivery, Southside'             ,'{delivery}'::text[]                  ,'inbound_call' ,false),
  ( 6,'Priya Raghunathan'   ,'+13615540657','priya.r@example.com'          ,NULL                    ,'Shellfish allergy in the family' ,'{allergy}'::text[]                   ,'inbound_call' ,false),
  ( 7,'Grant Lindeman'      ,'+13615540762',NULL                           ,'Lindeman Marine'       ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  ( 8,'Rosalie Fontenot'    ,'+13615540981',NULL                           ,NULL                    ,NULL                              ,'{takeout}'::text[]                   ,'inbound_call' ,false),
  ( 9,'Terrence Boudreau'   ,'+13615541096',NULL                           ,NULL                    ,NULL                              ,'{walk_in}'::text[]                   ,'inbound_call' ,false),
  (10,'Katherine Salinas'   ,'+13615541103','k.salinas@example.com'        ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  (11,'Wyatt Delacroix'     ,'+13615541217',NULL                           ,NULL                    ,NULL                              ,'{}'::text[]                          ,'inbound_call' ,false),
  (12,'Ofelia Mendiola'     ,'+13615541322','o.mendiola@example.com'       ,'Mendiola Family Trust' ,'Books the back room twice a year','{vip,large_party}'::text[]           ,'inbound_call' ,false),
  (13,'Brandon Shackleford' ,'+13615541436',NULL                           ,NULL                    ,NULL                              ,'{delivery}'::text[]                  ,'inbound_call' ,false),
  (14,'Yolanda Cavazos'     ,'+13615541548','y.cavazos@bayfrontlogistics.com','Bayfront Logistics'  ,'Corporate catering, quarterly'   ,'{catering,corporate}'::text[]        ,'inbound_call' ,false),
  (15,'Peter Nakamura'      ,'+13615541659','p.nakamura@example.com'       ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  (16,'Deandra Whitlock'    ,'+13615541761',NULL                           ,NULL                    ,NULL                              ,'{takeout}'::text[]                   ,'inbound_call' ,false),
  (17,'Camille Arceneaux'   ,'+13615541983',NULL                           ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  (18,'Hollis Tijerina'     ,'+13615542091',NULL                           ,NULL                    ,NULL                              ,'{}'::text[]                          ,'inbound_call' ,false),
  (19,'Sandra Guajardo'     ,'+13615542108','s.guajardo@example.com'       ,NULL                    ,'Service complaint, resolved'     ,'{complaint,follow_up}'::text[]       ,'inbound_call' ,false),
  (20,'Emmett Lonergan'     ,'+13615542216',NULL                           ,NULL                    ,NULL                              ,'{takeout}'::text[]                   ,'inbound_call' ,false),
  (21,'Delia Portillo'      ,'+13615542324','d.portillo@example.com'       ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  (22,'Jarrod Pemberton'    ,'+13615542437',NULL                           ,NULL                    ,'Asked not to be called again'    ,'{do_not_call}'::text[]               ,'inbound_call' ,true ),
  (23,'Lourdes Escamilla'   ,'+13615542549',NULL                           ,NULL                    ,NULL                              ,'{}'::text[]                          ,'inbound_call' ,false),
  (24,'Ike Sandoval'        ,'+13615542651',NULL                           ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  (25,'Nadine Broussard'    ,'+13615542768',NULL                           ,NULL                    ,NULL                              ,'{takeout}'::text[]                   ,'inbound_call' ,false),
  (26,'Alonzo Hinojosa'     ,'+13615542987','a.hinojosa@example.com'       ,NULL                    ,'Shellfish allergy'               ,'{allergy,reservations}'::text[]      ,'inbound_call' ,false),
  (27,'Meredith Falcone'    ,'+13615543095',NULL                           ,NULL                    ,NULL                              ,'{walk_in}'::text[]                   ,'inbound_call' ,false),
  (28,'Ruben Ontiveros'     ,'+13615543219',NULL                           ,NULL                    ,NULL                              ,'{delivery}'::text[]                  ,'inbound_call' ,false),
  (29,'Malcolm Dietrich'    ,'+13615543435','m.dietrich@portauthority.example.com','Port Authority' ,'Annual staff lunch'              ,'{catering,corporate}'::text[]        ,'inbound_call' ,false),
  (30,'Travis Longoria'     ,'+13615543658','t.longoria@example.com'       ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  (31,'Curtis Thibodeaux'   ,'+13615544436',NULL                           ,NULL                    ,'Asked to be removed from lists'  ,'{do_not_call,complaint}'::text[]     ,'inbound_call' ,true ),
  (32,'Franklin Doucette'   ,'+13615544215',NULL                           ,NULL                    ,NULL                              ,'{reservations}'::text[]              ,'inbound_call' ,false),
  (33,'Preston Ashworth'    ,'+13615545768','p.ashworth@gulfcoastcu.example.com','Gulf Coast Credit Union','Holiday party enquiry'      ,'{catering,corporate}'::text[]        ,'inbound_call' ,false),
  (34,'Rosemary Aucoin'     ,'+13615548216','r.aucoin@example.com'         ,'Aucoin Design'         ,'Studio opening, twenty five'     ,'{catering}'::text[]                  ,'inbound_call' ,false),
  (35,'Leticia Marchand'    ,'+13615547327','l.marchand@example.com'       ,NULL                    ,'Birthday bookings'               ,'{regular,reservations}'::text[]      ,'inbound_call' ,false)
) AS k(rn, nm, ph, em, co, notes, tags, src, dnc)
LEFT JOIN LATERAL (
  SELECT MIN(c.started_at) AS first_at, MAX(c.started_at) AS last_at, COUNT(*)::int AS cnt
  FROM _calls c WHERE c.phone = k.ph
) agg ON true
ON CONFLICT (id) DO NOTHING;

-- ── catering_leads ──────────────────────────────────────────────────────────
INSERT INTO catering_leads (
  id, tenant_id, call_id, contact_name, contact_phone, contact_email,
  event_date, event_type, guest_count, budget_cents, dietary_requirements,
  venue_address, status, notes, created_at, updated_at
)
SELECT
  ('e0000000-0000-4000-8000-000000' || '14' || lpad(g.rn::text, 4, '0'))::uuid,
  :tenant::uuid,
  lk.call_ref,
  g.nm, g.ph, g.em,
  (now() + (g.days_out || ' days')::interval)::date,
  g.etype, g.guests, g.budget, g.diet, g.venue, g.status, g.notes,
  now() - ((g.rn * 31) || ' hours')::interval,
  now() - ((g.rn * 31) || ' hours')::interval
FROM (VALUES
  (1,'Rosemary Aucoin' ,'+13615548216','r.aucoin@example.com'                ,11,'studio_opening'  , 25, 175000,'Two vegetarian'                 ,'318 Chaparral Street, Corpus Christi','new'       ,'Wants passed canapes and a raw bar station.'),
  (2,'Preston Ashworth','+13615545768','p.ashworth@gulfcoastcu.example.com'  ,38,'holiday_party'   , 80, 720000,'Four vegetarian, two gluten free','5350 South Staples Street'           ,'quoted'    ,'Quote sent for buffet plus carving station. Awaiting board sign-off.'),
  (3,'Malcolm Dietrich','+13615543435','m.dietrich@portauthority.example.com',19,'corporate_lunch' , 40, 320000,'One gluten free'                ,'222 Power Street'                    ,'contacted' ,'Delivered lunch, needs to clear security in advance.'),
  (4,'Yolanda Cavazos' ,'+13615541548','y.cavazos@bayfrontlogistics.com'     , 6,'corporate_lunch' , 60, 450000,'Two vegetarian, one gluten free','1201 North Shoreline Boulevard'      ,'confirmed' ,'Quarterly all-hands. Repeat client, third booking.'),
  (5,'Delphine Arsenault','+13615549104','d.arsenault@example.com'           ,26,'wedding_rehearsal', 35, 290000,'One nut allergy'               ,'Padre Island, private residence'     ,'new'       ,'Rehearsal dinner, seated service requested.'),
  (6,'Wendell Broussard','+13615549218','w.broussard@example.com'            ,54,'anniversary'     , 20, 140000,NULL                             ,'In house, back room'                 ,'quoted'    ,'Fiftieth anniversary, set menu quoted.'),
  (7,'Ingrid Castellow','+13615549327','i.castellow@harborschools.example.com', 13,'fundraiser'    ,120, 850000,'Nut free venue'                 ,'4602 Ocean Drive'                    ,'contacted' ,'School fundraiser. Nut-free kitchen required, confirming feasibility.'),
  (8,'Rodrigo Palafox' ,'+13615549435',NULL                                  ,31,'birthday'        , 30, 195000,'Three vegetarian'               ,'In house, back room'                 ,'lost'      ,'Went with another venue on price.')
) AS g(rn, nm, ph, em, days_out, etype, guests, budget, diet, venue, status, notes)
LEFT JOIN LATERAL (
  SELECT c.call_id AS call_ref FROM _calls c
  WHERE c.phone = g.ph AND c.kind = 'catering'
  ORDER BY c.started_at DESC LIMIT 1
) lk ON true
ON CONFLICT (id) DO NOTHING;

-- ── restaurant_complaints ───────────────────────────────────────────────────
-- NOTE: no dashboard page currently reads this table (src/domain/restaurant/
-- complaints.ts and the Test Center wipe list are the only consumers), so
-- these rows will not appear on screen. Seeded anyway so the escalated calls
-- above have the record they claim to have created.
INSERT INTO restaurant_complaints (
  id, tenant_id, call_id, order_id, reservation_id, customer_name,
  customer_phone, complaint_type, description, severity, status,
  resolution, compensation_offered, resolved_at, created_at, updated_at
)
SELECT
  ('e0000000-0000-4000-8000-000000' || '15' || lpad(x.rn::text, 4, '0'))::uuid,
  :tenant::uuid,
  lk.call_ref,
  NULL, NULL,
  x.nm, x.ph, x.ctype, x.descr, x.sev, x.status, x.res, x.comp,
  CASE WHEN x.status = 'resolved' THEN now() - ((x.rn * 9) || ' hours')::interval END,
  now() - ((x.rn * 47) || ' hours')::interval,
  now() - ((x.rn * 47) || ' hours')::interval
FROM (VALUES
  (1,'Sandra Guajardo' ,'+13615542108','food_quality','Two pasta dishes served cold; raised with the server at the table and not addressed.','high'  ,'resolved','General manager called back the same evening. Full comp on both mains.','Both mains comped, dessert on next visit'),
  (2,'Curtis Thibodeaux','+13615544436','service'    ,'Waited thirty five minutes past the booked time with no update from the host stand.','medium','resolved','Manager apologised and comped the appetiser course.','Appetisers comped'),
  (3,'Weldon Trahan'   ,'+13615546658','order_accuracy','Delivery arrived missing the dessert and one side.','medium','in_progress','Refund for missing items submitted, awaiting card processor.','Refund for missing items'),
  (4,'Odette Lemaire'  ,'+13615549548','cleanliness' ,'Reported a dirty table setting on arrival on a Saturday evening.','low','open',NULL,NULL)
) AS x(rn, nm, ph, ctype, descr, sev, status, res, comp)
LEFT JOIN LATERAL (
  SELECT c.call_id AS call_ref FROM _calls c
  WHERE c.phone = x.ph AND c.kind = 'complaint'
  ORDER BY c.started_at DESC LIMIT 1
) lk ON true
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- AUDIT EVENTS
--
-- The audit API resolves an actor by matching audit_events.actor_id against
-- users.auth_id, so actor_id is only populated where this tenant actually has
-- a member whose auth_id is UUID-shaped. Where it is not, the row renders as
-- "System", which is honest — a seeded event has no real human behind it.
-- ============================================================================
INSERT INTO audit_events (id, tenant_id, actor_id, action, resource_type, resource_id, metadata, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '16' || lpad(a.rn::text, 4, '0'))::uuid,
  :tenant::uuid,
  actor.aid,
  a.action, a.rtype, a.rid, a.meta,
  now() - ((a.hrs) || ' hours')::interval
FROM (VALUES
  ( 1,'agent.activated'         ,'agent'                ,'harbor-house-agent-v7','{"version":7,"industry":"restaurant"}'::jsonb,   2),
  ( 2,'agent.prompt_edited'     ,'agent_config_version' ,'harbor-house-agent-v7','{"section":"voice_rules","chars_removed":412}'::jsonb, 3),
  ( 3,'call_evaluated'          ,'call_evaluation'      ,'e0000000-0000-4000-8000-000000050091','{"score":91,"evaluator":"automated-v1"}'::jsonb, 5),
  ( 4,'call.outbound_initiated' ,'call'                 ,'e0000000-0000-4000-8000-000000010081','{"purpose":"reservation_confirmation"}'::jsonb, 74),
  ( 5,'outbound_call_blocked'   ,'outbound_attempt'     ,'+13615542437'          ,'{"reason":"do_not_call"}'::jsonb,               29),
  ( 6,'website_imported'        ,'knowledge_fact'       ,'harborhousekitchen.com','{"pages":14,"facts_extracted":63}'::jsonb,      96),
  ( 7,'agent.prompt_edited'     ,'agent_config_version' ,'harbor-house-agent-v6','{"section":"greeting"}'::jsonb,                 121),
  ( 8,'agent.rolled_back'       ,'agent'                ,'harbor-house-agent-v5','{"from":6,"to":5,"reason":"verbose_turns"}'::jsonb, 168),
  ( 9,'agent.activated'         ,'agent'                ,'harbor-house-agent-v6','{"version":6}'::jsonb,                          192),
  (10,'call.deleted'            ,'call'                 ,'test-call-cleanup'     ,'{"count":11,"scope":"test_center"}'::jsonb,     26),
  (11,'privacy_export'          ,'tenant'               ,'c8460639-2c35-480f-8b2f-c7b425740207','{"format":"json","rows":2841}'::jsonb, 340),
  (12,'tenant.activated'        ,'tenant'               ,'c8460639-2c35-480f-8b2f-c7b425740207','{"industry":"restaurant"}'::jsonb, 700),
  (13,'call.outbound_failed'    ,'call'                 ,'e0000000-0000-4000-8000-000000010056','{"error":"carrier_rejected"}'::jsonb, 312),
  (14,'agent.prompt_edited'     ,'agent_config_version' ,'harbor-house-agent-v4','{"section":"menu_knowledge"}'::jsonb,           420),
  (15,'call_evaluated'          ,'call_evaluation'      ,'e0000000-0000-4000-8000-000000050021','{"score":64,"evaluator":"automated-v1"}'::jsonb, 552),
  (16,'agent.deactivated'       ,'agent'                ,'harbor-house-agent-v3','{"reason":"superseded"}'::jsonb,                600),
  (17,'website_imported'        ,'knowledge_fact'       ,'harborhousekitchen.com','{"pages":9,"facts_extracted":31}'::jsonb,      640),
  (18,'agent.activated'         ,'agent'                ,'harbor-house-agent-v4','{"version":4}'::jsonb,                          660),
  (19,'call.outbound_initiated' ,'call'                 ,'e0000000-0000-4000-8000-000000010049','{"purpose":"table_ready_callback"}'::jsonb, 358),
  (20,'agent.activated'         ,'agent'                ,'harbor-house-agent-v3','{"version":3}'::jsonb,                          690)
) AS a(rn, action, rtype, rid, meta, hrs)
LEFT JOIN LATERAL (
  SELECT u.auth_id::uuid AS aid
  FROM users u
  JOIN tenant_members tm ON tm.user_id = u.id
  WHERE tm.tenant_id = :tenant::uuid
    AND u.auth_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  ORDER BY u.created_at
  LIMIT 1
) actor ON true
ON CONFLICT (id) DO NOTHING;

-- ── notifications ───────────────────────────────────────────────────────────
INSERT INTO notifications (id, tenant_id, user_id, channel, type, title, body, data, is_read, read_at, sent_at, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '17' || lpad(nf.rn::text, 4, '0'))::uuid,
  :tenant::uuid, NULL, nf.chan, nf.ntype, nf.title, nf.body, nf.data,
  nf.is_read,
  CASE WHEN nf.is_read THEN now() - ((nf.hrs - 1) || ' hours')::interval END,
  now() - (nf.hrs || ' hours')::interval,
  now() - (nf.hrs || ' hours')::interval
FROM (VALUES
  (1,'in_app','escalation'  ,'Service complaint needs a callback','Weldon Trahan reported a missing delivery item. Refund submitted, awaiting processor.','{"severity":"medium"}'::jsonb,false,  6),
  (2,'in_app','catering'    ,'New catering lead'                 ,'Rosemary Aucoin, 25 guests, studio opening. Quote due within one business day.'      ,'{"guest_count":25}'::jsonb,   false, 31),
  (3,'email' ,'daily_digest','Yesterday: 4 calls, 3 resolved'    ,'Average handle time 1m 18s. One escalation to the general manager.'                  ,'{"calls":4}'::jsonb,          true,  20),
  (4,'in_app','reservation' ,'Large party booked'                ,'Ofelia Mendiola, party of 12, nine days out. Set menu applies.'                      ,'{"party_size":12}'::jsonb,    true, 264),
  (5,'in_app','escalation'  ,'Complaint escalated'               ,'Sandra Guajardo — two mains served cold. General manager notified.'                  ,'{"severity":"high"}'::jsonb,  true, 552),
  (6,'in_app','agent'       ,'Agent updated'                     ,'Voice rules revised: shorter turns, one question per turn, agent closes the call.'   ,'{"version":7}'::jsonb,        true,  72),
  (7,'in_app','catering'    ,'Catering quote accepted'           ,'Bayfront Logistics confirmed for 60 guests.'                                         ,'{"guest_count":60}'::jsonb,   true, 148),
  (8,'in_app','usage'       ,'80% of monthly call minutes used'  ,'You have used 1,604 of 2,000 included minutes this period.'                          ,'{"pct":80}'::jsonb,           false, 12)
) AS nf(rn, chan, ntype, title, body, data, is_read, hrs)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BILLING + USAGE
--
-- The Usage page uses billing_accounts.current_period_start/end as the period
-- when both are present; without this row it silently falls back to calendar
-- month-to-date, which makes the period label look arbitrary during a demo.
-- The unique constraint is on tenant_id, so that is the conflict target.
-- ============================================================================
INSERT INTO billing_accounts (
  id, tenant_id, stripe_customer_id, plan, status,
  current_period_start, current_period_end, metadata, created_at, updated_at
) VALUES (
  'e0000000-0000-4000-8000-000000200001',
  :tenant::uuid,
  'cus_demo_harborhouse',
  'growth',
  'active',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month',
  '{"seats":4,"included_minutes":2000}'::jsonb,
  now() - interval '400 days',
  now()
)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO usage_limits (id, tenant_id, resource, limit_value, period, is_hard_limit, created_at, updated_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '19' || lpad(u.rn::text, 4, '0'))::uuid,
  :tenant::uuid, u.res, u.lim, 'month', u.hard, now() - interval '400 days', now()
FROM (VALUES
  (1,'call_minutes'     , 2000, false),
  (2,'sms'              ,  500, false),
  (3,'recording_storage',  250, false),
  (4,'outbound_calls'   , 1000, true)
) AS u(rn, res, lim, hard)
ON CONFLICT (id) DO NOTHING;

-- Ledger entries land inside the current billing period so the Usage tiles
-- have something to total. SMS and recording_storage are named explicitly
-- because those two resource strings drive the headline tiles.
INSERT INTO usage_ledger (id, tenant_id, resource, quantity, unit, reference_type, reference_id, recorded_at, created_at)
SELECT
  ('e0000000-0000-4000-8000-000000' || '18' || lpad(l.rn::text, 4, '0'))::uuid,
  :tenant::uuid, l.res, l.qty, l.unit, l.rtype, NULL,
  GREATEST(date_trunc('month', now()), now() - (l.days || ' days')::interval),
  now() - (l.days || ' days')::interval
FROM (VALUES
  ( 1,'sms'              , 41,'message','reservation_confirmation', 1),
  ( 2,'sms'              , 38,'message','reservation_confirmation', 3),
  ( 3,'sms'              , 44,'message','reservation_confirmation', 6),
  ( 4,'sms'              , 36,'message','order_ready',              9),
  ( 5,'sms'              , 47,'message','order_ready',             12),
  ( 6,'sms'              , 33,'message','waitlist_callback',       16),
  ( 7,'recording_storage',  9,'GB'     ,'call_recording',           2),
  ( 8,'recording_storage',  8,'GB'     ,'call_recording',           8),
  ( 9,'recording_storage', 11,'GB'     ,'call_recording',          15),
  (10,'call_minutes'     ,412,'minute' ,'inbound',                  4),
  (11,'call_minutes'     ,389,'minute' ,'inbound',                 11),
  (12,'call_minutes'     ,431,'minute' ,'inbound',                 18),
  (13,'call_minutes'     ,372,'minute' ,'inbound',                 25),
  (14,'outbound_calls'   , 26,'call'   ,'outbound',                 7),
  (15,'outbound_calls'   , 31,'call'   ,'outbound',                21)
) AS l(rn, res, qty, unit, rtype, days)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- SANITY CHECK — run after seeding to confirm the demo will look right.
-- ============================================================================
-- SELECT 'calls' t, count(*) FROM calls WHERE id::text LIKE 'e0000000-0000-4000-8000-00000001%'
-- UNION ALL SELECT 'completed', count(*) FROM calls WHERE id::text LIKE 'e0000000-0000-4000-8000-00000001%' AND status='completed'
-- UNION ALL SELECT 'upcoming reservations', count(*) FROM reservations
--   WHERE id::text LIKE 'e0000000-0000-4000-8000-00000010%'
--     AND status <> 'cancelled' AND scheduled_at >= now() - interval '12 hours'
-- UNION ALL SELECT 'orders with $0 total', count(*) FROM orders
--   WHERE id::text LIKE 'e0000000-0000-4000-8000-00000011%' AND total_cents = 0;
-- -- Expect: 93 calls, 86 completed, 14 upcoming reservations, 0 zero-total orders.

-- ============================================================================
-- CLEANUP (uncomment to remove everything this file seeded)
--
-- Child rows of `calls` cascade on delete, but they are listed explicitly so
-- this also cleans up correctly if the calls block was never run.
-- ============================================================================
-- DELETE FROM usage_ledger          WHERE id::text LIKE 'e0000000-0000-4000-8000-00000018%';
-- DELETE FROM usage_limits          WHERE id::text LIKE 'e0000000-0000-4000-8000-00000019%';
-- DELETE FROM billing_accounts      WHERE id = 'e0000000-0000-4000-8000-000000200001';
-- DELETE FROM notifications         WHERE id::text LIKE 'e0000000-0000-4000-8000-00000017%';
-- DELETE FROM audit_events          WHERE id::text LIKE 'e0000000-0000-4000-8000-00000016%';
-- DELETE FROM restaurant_complaints WHERE id::text LIKE 'e0000000-0000-4000-8000-00000015%';
-- DELETE FROM catering_leads        WHERE id::text LIKE 'e0000000-0000-4000-8000-00000014%';
-- DELETE FROM contacts              WHERE id::text LIKE 'e0000000-0000-4000-8000-00000013%';
-- DELETE FROM order_items           WHERE id::text LIKE 'e0000000-0000-4000-8000-00000012%';
-- DELETE FROM orders                WHERE id::text LIKE 'e0000000-0000-4000-8000-00000011%';
-- DELETE FROM reservations          WHERE id::text LIKE 'e0000000-0000-4000-8000-00000010%';
-- DELETE FROM recording_consents    WHERE id::text LIKE 'e0000000-0000-4000-8000-00000021%';
-- DELETE FROM call_costs            WHERE id::text LIKE 'e0000000-0000-4000-8000-00000009%';
-- DELETE FROM call_participants     WHERE id::text LIKE 'e0000000-0000-4000-8000-00000008%';
-- DELETE FROM call_events           WHERE id::text LIKE 'e0000000-0000-4000-8000-00000007%';
-- DELETE FROM call_tool_runs        WHERE id::text LIKE 'e0000000-0000-4000-8000-00000006%';
-- DELETE FROM call_evaluations      WHERE id::text LIKE 'e0000000-0000-4000-8000-00000005%';
-- DELETE FROM call_outcomes         WHERE id::text LIKE 'e0000000-0000-4000-8000-00000004%';
-- DELETE FROM call_summaries        WHERE id::text LIKE 'e0000000-0000-4000-8000-00000003%';
-- DELETE FROM call_transcripts      WHERE id::text LIKE 'e0000000-0000-4000-8000-00000002%';
-- DELETE FROM calls                 WHERE id::text LIKE 'e0000000-0000-4000-8000-00000001%';
