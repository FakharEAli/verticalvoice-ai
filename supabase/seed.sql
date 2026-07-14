-- ============================================================================
-- VerticalVoice AI — Seed Data
-- 3 demo tenants: Healthcare, Restaurant, Real Estate
-- All data is synthetic/demo — clearly labeled
-- ============================================================================

-- ============================================================================
-- TENANTS
-- ============================================================================

INSERT INTO tenants (id, name, slug, industry, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Sunrise Medical Clinic', 'sunrise-medical', 'healthcare', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'Bellas Italian Kitchen', 'bellas-italian', 'restaurant', 'active'),
  ('a0000000-0000-0000-0000-000000000003', 'Metro Realty Group', 'metro-realty', 'real_estate', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- DEMO USER
-- ============================================================================

INSERT INTO users (id, auth_id, email, full_name) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'demo-auth-id-001', 'demo@verticalvoice.ai', 'Demo User')
ON CONFLICT (auth_id) DO NOTHING;

INSERT INTO tenant_members (id, tenant_id, user_id, role) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'owner'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'owner'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'owner')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ============================================================================
-- BUSINESS PROFILES
-- ============================================================================

INSERT INTO business_profiles (id, tenant_id, business_name, phone, email, website, address_line1, city, state, zip, country, timezone) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'Sunrise Medical Clinic', '+15551001000', 'info@sunrisemedical.demo', 'https://sunrisemedical.demo', '100 Health Ave', 'Austin', 'TX', '78701', 'US', 'America/Chicago'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'Bellas Italian Kitchen', '+15552002000', 'info@bellasitalian.demo', 'https://bellasitalian.demo', '200 Main St', 'New York', 'NY', '10001', 'US', 'America/New_York'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'Metro Realty Group', '+15553003000', 'info@metrorealty.demo', 'https://metrorealty.demo', '300 Commerce Blvd', 'Chicago', 'IL', '60601', 'US', 'America/Chicago')
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- VOICE PROFILES
-- ============================================================================

INSERT INTO voice_profiles (id, tenant_id, provider, voice_id, speed, greeting, language) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'elevenlabs', 'demo-voice-medical', 1.0, 'Thank you for calling Sunrise Medical Clinic. How may I help you today?', 'en-US'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'elevenlabs', 'demo-voice-restaurant', 1.0, 'Welcome to Bellas Italian Kitchen! How can I assist you?', 'en-US'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'elevenlabs', 'demo-voice-realestate', 1.0, 'Thank you for calling Metro Realty Group. How can I help you today?', 'en-US')
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- POLICY SETTINGS
-- ============================================================================

INSERT INTO policy_settings (id, tenant_id, recording_enabled, recording_consent_required, hipaa_mode, max_call_duration_seconds, allow_outbound, pii_redaction_enabled) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', true, true, true, 1800, false, true),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', true, true, false, 1200, true, false),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', true, true, false, 1800, true, false)
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- OPERATING HOURS (Mon-Fri 9-5, Sat 9-1, Sun closed) for all 3 tenants
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
-- ============================================================================

DO $$
DECLARE
  t_id UUID;
  tenant_ids UUID[] := ARRAY[
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'a0000000-0000-0000-0000-000000000002'::UUID,
    'a0000000-0000-0000-0000-000000000003'::UUID
  ];
  d INT;
BEGIN
  FOREACH t_id IN ARRAY tenant_ids
  LOOP
    FOR d IN 0..6 LOOP
      INSERT INTO operating_hours (tenant_id, day_of_week, open_time, close_time, is_closed)
      VALUES (
        t_id,
        d,
        CASE WHEN d = 0 THEN '00:00'::TIME ELSE '09:00'::TIME END,
        CASE WHEN d = 0 THEN '00:00'::TIME WHEN d = 6 THEN '13:00'::TIME ELSE '17:00'::TIME END,
        d = 0  -- Sunday closed
      );
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

DO $$
DECLARE
  t_id UUID;
  tenant_ids UUID[] := ARRAY[
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'a0000000-0000-0000-0000-000000000002'::UUID,
    'a0000000-0000-0000-0000-000000000003'::UUID
  ];
  flag TEXT;
  flags TEXT[] := ARRAY['voice_agent', 'call_recording', 'knowledge_base', 'analytics_dashboard', 'webhook_integrations'];
BEGIN
  FOREACH t_id IN ARRAY tenant_ids
  LOOP
    FOREACH flag IN ARRAY flags
    LOOP
      INSERT INTO feature_flags (tenant_id, flag_name, enabled)
      VALUES (t_id, flag, true)
      ON CONFLICT (tenant_id, flag_name) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================================
-- SAMPLE CALLS (5 per tenant with different intents)
-- ============================================================================

-- Healthcare calls
INSERT INTO calls (id, tenant_id, direction, status, caller_number, called_number, duration_seconds, started_at, ended_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'inbound', 'completed', '+15559001001', '+15551001000', 180, now() - interval '7 days', now() - interval '7 days' + interval '3 minutes'),
  ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'inbound', 'completed', '+15559001002', '+15551001000', 120, now() - interval '5 days', now() - interval '5 days' + interval '2 minutes'),
  ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'inbound', 'completed', '+15559001003', '+15551001000', 90, now() - interval '3 days', now() - interval '3 days' + interval '90 seconds'),
  ('c1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'inbound', 'completed', '+15559001004', '+15551001000', 240, now() - interval '2 days', now() - interval '2 days' + interval '4 minutes'),
  ('c1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'inbound', 'completed', '+15559001005', '+15551001000', 60, now() - interval '1 day', now() - interval '1 day' + interval '1 minute');

-- Restaurant calls
INSERT INTO calls (id, tenant_id, direction, status, caller_number, called_number, duration_seconds, started_at, ended_at) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'inbound', 'completed', '+15559002001', '+15552002000', 150, now() - interval '6 days', now() - interval '6 days' + interval '150 seconds'),
  ('c2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'inbound', 'completed', '+15559002002', '+15552002000', 200, now() - interval '4 days', now() - interval '4 days' + interval '200 seconds'),
  ('c2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'inbound', 'completed', '+15559002003', '+15552002000', 100, now() - interval '3 days', now() - interval '3 days' + interval '100 seconds'),
  ('c2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'inbound', 'completed', '+15559002004', '+15552002000', 180, now() - interval '2 days', now() - interval '2 days' + interval '3 minutes'),
  ('c2000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'inbound', 'completed', '+15559002005', '+15552002000', 90, now() - interval '1 day', now() - interval '1 day' + interval '90 seconds');

-- Real estate calls
INSERT INTO calls (id, tenant_id, direction, status, caller_number, called_number, duration_seconds, started_at, ended_at) VALUES
  ('c3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'inbound', 'completed', '+15559003001', '+15553003000', 300, now() - interval '6 days', now() - interval '6 days' + interval '5 minutes'),
  ('c3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'inbound', 'completed', '+15559003002', '+15553003000', 250, now() - interval '5 days', now() - interval '5 days' + interval '250 seconds'),
  ('c3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'inbound', 'completed', '+15559003003', '+15553003000', 180, now() - interval '3 days', now() - interval '3 days' + interval '3 minutes'),
  ('c3000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'inbound', 'completed', '+15559003004', '+15553003000', 200, now() - interval '2 days', now() - interval '2 days' + interval '200 seconds'),
  ('c3000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'outbound', 'completed', '+15553003000', '+15559003005', 120, now() - interval '1 day', now() - interval '1 day' + interval '2 minutes');

-- Call summaries
INSERT INTO call_summaries (call_id, tenant_id, summary, sentiment, model) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Patient called to schedule annual physical. Appointment booked for next Tuesday at 10am with Dr. Chen.', 'positive', 'gpt-4o'),
  ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Patient requested prescription refill for Lisinopril 10mg. Forwarded to pharmacy for processing.', 'neutral', 'gpt-4o'),
  ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Patient inquired about insurance acceptance. Confirmed we accept Blue Cross Blue Shield.', 'neutral', 'gpt-4o'),
  ('c1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Patient called about lab results. Escalated to nurse for callback.', 'neutral', 'gpt-4o'),
  ('c1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Patient cancelled upcoming appointment due to scheduling conflict. Rescheduled for following week.', 'neutral', 'gpt-4o'),
  ('c2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Guest made reservation for 4 people this Saturday at 7pm. Noted gluten allergy.', 'positive', 'gpt-4o'),
  ('c2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Customer placed takeout order: 2 Margherita pizzas, 1 Caesar salad, 1 Tiramisu.', 'positive', 'gpt-4o'),
  ('c2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Customer asked about catering for corporate event, 50 guests. Forwarded to catering manager.', 'positive', 'gpt-4o'),
  ('c2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Customer called to modify existing reservation from 6pm to 8pm. Updated successfully.', 'neutral', 'gpt-4o'),
  ('c2000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Customer inquired about hours and menu specials. Provided current daily specials.', 'positive', 'gpt-4o'),
  ('c3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Buyer inquiry about 3BR listing on Oak Street. Scheduled showing for Wednesday at 2pm.', 'positive', 'gpt-4o'),
  ('c3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Seller called about listing status. Provided market update and recent comparable sales.', 'neutral', 'gpt-4o'),
  ('c3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Potential buyer asked about properties in downtown area, budget 400-500K. Created lead record.', 'positive', 'gpt-4o'),
  ('c3000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Tenant reported leaking faucet in unit 4B. Maintenance request created, priority medium.', 'neutral', 'gpt-4o'),
  ('c3000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Follow-up call to buyer after showing. Buyer expressed strong interest, requesting second viewing.', 'positive', 'gpt-4o');

-- ============================================================================
-- HEALTHCARE-SPECIFIC SEED DATA
-- ============================================================================

-- Providers
INSERT INTO healthcare_providers (id, tenant_id, npi, first_name, last_name, title, specialty, department, email, phone, is_active) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '1234567890', 'Sarah', 'Chen', 'MD', 'Family Medicine', 'Primary Care', 'dr.chen@sunrisemedical.demo', '+15551001001', true),
  ('d1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '2345678901', 'James', 'Park', 'DO', 'Internal Medicine', 'Primary Care', 'dr.park@sunrisemedical.demo', '+15551001002', true),
  ('d1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '3456789012', 'Maria', 'Rodriguez', 'NP', 'Pediatrics', 'Pediatrics', 'np.rodriguez@sunrisemedical.demo', '+15551001003', true);

-- Appointment types
INSERT INTO appointment_types (id, tenant_id, name, description, duration_minutes, buffer_minutes, color, is_active, requires_referral) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Annual Physical', 'Comprehensive annual wellness exam', 45, 15, '#4CAF50', true, false),
  ('e1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sick Visit', 'Acute illness evaluation', 20, 5, '#F44336', true, false),
  ('e1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Follow-Up', 'Follow-up from previous visit', 15, 5, '#2196F3', true, false),
  ('e1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Well Child Visit', 'Pediatric wellness check', 30, 10, '#9C27B0', true, false),
  ('e1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Specialist Consultation', 'Referral-based specialist visit', 60, 15, '#FF9800', true, true);

-- Sample appointments
INSERT INTO appointments (id, tenant_id, call_id, provider_id, appointment_type_id, patient_name, patient_phone, patient_email, scheduled_at, duration_minutes, status, reason) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'DEMO: Alice Johnson', '+15559001001', 'alice.j@demo.test', now() + interval '3 days', 45, 'scheduled', 'Annual physical exam'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', NULL, 'd1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'DEMO: Bob Smith', '+15559001006', 'bob.s@demo.test', now() + interval '1 day', 20, 'confirmed', 'Persistent cough'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', NULL, 'd1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000004', 'DEMO: Carol Davis (child)', '+15559001007', NULL, now() + interval '5 days', 30, 'scheduled', 'Well child 3-year visit');

-- ============================================================================
-- RESTAURANT-SPECIFIC SEED DATA
-- ============================================================================

-- Menu
INSERT INTO restaurant_menus (id, tenant_id, name, description, is_active) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Main Menu', 'All-day dining menu', true);

-- Categories (3)
INSERT INTO menu_categories (id, menu_id, tenant_id, name, description, sort_order) VALUES
  ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Antipasti', 'Starters and appetizers', 1),
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Primi & Secondi', 'Main courses', 2),
  ('f2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Dolci', 'Desserts', 3);

-- Menu items (15 total: 5 per category)
INSERT INTO menu_items (id, category_id, tenant_id, name, description, price_cents, calories, allergens, dietary_tags, sort_order) VALUES
  -- Antipasti
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Bruschetta Classica', 'Toasted bread with tomato, basil, garlic', 1295, 280, ARRAY['gluten','dairy'], ARRAY['vegetarian'], 1),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Caprese Salad', 'Fresh mozzarella, tomato, basil, balsamic', 1495, 320, ARRAY['dairy'], ARRAY['vegetarian','gluten-free'], 2),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Calamari Fritti', 'Crispy fried calamari with marinara', 1595, 450, ARRAY['shellfish','gluten'], NULL, 3),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Arancini', 'Risotto balls stuffed with mozzarella', 1395, 380, ARRAY['gluten','dairy'], ARRAY['vegetarian'], 4),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Caesar Salad', 'Romaine, parmesan, croutons, house dressing', 1195, 350, ARRAY['gluten','dairy','egg'], ARRAY['vegetarian'], 5),
  -- Primi & Secondi
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Margherita Pizza', 'San Marzano tomato, fresh mozzarella, basil', 1895, 680, ARRAY['gluten','dairy'], ARRAY['vegetarian'], 1),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Spaghetti Carbonara', 'Guanciale, egg, pecorino, black pepper', 2195, 720, ARRAY['gluten','dairy','egg'], NULL, 2),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Penne Arrabbiata', 'Spicy tomato sauce with garlic and chili', 1795, 580, ARRAY['gluten'], ARRAY['vegan'], 3),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Chicken Parmigiana', 'Breaded chicken with marinara and mozzarella', 2495, 850, ARRAY['gluten','dairy','egg'], NULL, 4),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Risotto ai Funghi', 'Arborio rice with wild mushrooms and truffle oil', 2295, 620, ARRAY['dairy'], ARRAY['vegetarian','gluten-free'], 5),
  -- Dolci
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Tiramisu', 'Classic espresso-soaked ladyfingers with mascarpone', 1195, 420, ARRAY['gluten','dairy','egg'], ARRAY['vegetarian'], 1),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Panna Cotta', 'Vanilla cream with berry compote', 1095, 350, ARRAY['dairy'], ARRAY['vegetarian','gluten-free'], 2),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Cannoli', 'Crispy shells filled with ricotta cream', 995, 380, ARRAY['gluten','dairy'], ARRAY['vegetarian'], 3),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Gelato (3 scoops)', 'House-made Italian gelato, ask for flavors', 895, 300, ARRAY['dairy'], ARRAY['vegetarian','gluten-free'], 4),
  (gen_random_uuid(), 'f2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Affogato', 'Vanilla gelato with hot espresso', 795, 250, ARRAY['dairy'], ARRAY['vegetarian','gluten-free'], 5);

-- Modifier groups
INSERT INTO menu_modifier_groups (id, tenant_id, name, min_selections, max_selections, is_required) VALUES
  ('f3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Pizza Size', 1, 1, true),
  ('f3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Extra Toppings', 0, 5, false);

INSERT INTO menu_modifiers (group_id, tenant_id, name, price_cents, sort_order) VALUES
  ('f3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Regular (12")', 0, 1),
  ('f3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Large (16")', 400, 2),
  ('f3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Extra Cheese', 200, 1),
  ('f3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Pepperoni', 250, 2),
  ('f3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Mushrooms', 150, 3);

-- Restaurant tables
INSERT INTO restaurant_tables (id, tenant_id, table_number, capacity, section, is_active) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'T1', 2, 'Indoor', true),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'T2', 4, 'Indoor', true),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'T3', 4, 'Indoor', true),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'T4', 6, 'Indoor', true),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'P1', 4, 'Patio', true),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'P2', 6, 'Patio', true);

-- Reservations (3)
INSERT INTO reservations (id, tenant_id, call_id, guest_name, guest_phone, guest_email, party_size, scheduled_at, status, special_requests) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'DEMO: Marco Rossi', '+15559002001', 'marco.r@demo.test', 4, now() + interval '2 days' + interval '19 hours', 'confirmed', 'Gluten-free options needed'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', NULL, 'DEMO: Lisa Park', '+15559002006', 'lisa.p@demo.test', 2, now() + interval '3 days' + interval '18 hours', 'confirmed', 'Anniversary dinner, window table if possible'),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', NULL, 'DEMO: David Kim', '+15559002007', NULL, 6, now() + interval '5 days' + interval '20 hours', 'pending', 'Birthday celebration');

-- ============================================================================
-- REAL ESTATE-SPECIFIC SEED DATA
-- ============================================================================

-- RE Agents (3)
INSERT INTO re_agents (id, tenant_id, first_name, last_name, email, phone, license_number, license_state, specializations, is_active) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Michael', 'Torres', 'm.torres@metrorealty.demo', '+15553003001', 'IL-RE-47201', 'IL', ARRAY['residential','luxury'], true),
  ('d1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Jennifer', 'Walsh', 'j.walsh@metrorealty.demo', '+15553003002', 'IL-RE-52843', 'IL', ARRAY['residential','first-time-buyers'], true),
  ('d1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'David', 'Nguyen', 'd.nguyen@metrorealty.demo', '+15553003003', 'IL-RE-61029', 'IL', ARRAY['commercial','investment'], true);

-- Listings (5)
INSERT INTO listings (id, tenant_id, agent_id, mls_number, status, listing_type, property_type, address_line1, city, state, zip, price_cents, bedrooms, bathrooms, square_feet, year_built, description) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'MLS-DEMO-001', 'active', 'sale', 'single_family', '742 Oak Street', 'Chicago', 'IL', '60614', 52500000, 3, 2.5, 1850, 2005, 'DEMO: Beautifully updated 3BR/2.5BA in Lincoln Park with hardwood floors and modern kitchen'),
  ('e1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'MLS-DEMO-002', 'active', 'sale', 'condo', '1200 Lake Shore Dr, Unit 14C', 'Chicago', 'IL', '60610', 78500000, 2, 2, 1400, 2018, 'DEMO: Stunning lake-view condo with floor-to-ceiling windows and premium finishes'),
  ('e1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'MLS-DEMO-003', 'active', 'sale', 'single_family', '456 Elm Avenue', 'Evanston', 'IL', '60201', 42000000, 4, 3, 2200, 1998, 'DEMO: Spacious 4BR family home near top-rated schools with large backyard'),
  ('e1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'MLS-DEMO-004', 'pending', 'sale', 'townhouse', '890 Division St', 'Chicago', 'IL', '60622', 38900000, 3, 2, 1600, 2012, 'DEMO: Modern townhouse in Wicker Park with rooftop deck and garage parking'),
  ('e1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'MLS-DEMO-005', 'active', 'lease', 'condo', '333 Wacker Dr, Unit 22A', 'Chicago', 'IL', '60606', 350000, 1, 1, 750, 2020, 'DEMO: Downtown studio rental with city views, in-unit laundry');

-- Leads (3)
INSERT INTO real_estate_leads (id, tenant_id, call_id, agent_id, first_name, last_name, email, phone, lead_type, source, status, budget_min_cents, budget_max_cents, timeline) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'DEMO: Sarah', 'Miller', 's.miller@demo.test', '+15559003001', 'buyer', 'phone_call', 'active', 40000000, 55000000, '3-6 months'),
  ('f1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', 'DEMO: Tom', 'Anderson', 't.anderson@demo.test', '+15559003003', 'buyer', 'phone_call', 'new', 35000000, 50000000, '1-3 months'),
  ('f1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', NULL, 'd1000000-0000-0000-0000-000000000003', 'DEMO: Karen', 'Lee', 'k.lee@demo.test', '+15559003008', 'seller', 'website', 'qualified', NULL, NULL, 'ASAP');

-- Showings (2)
INSERT INTO showings (id, tenant_id, listing_id, lead_id, agent_id, call_id, scheduled_at, duration_minutes, status, interest_level) VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', now() + interval '2 days' + interval '14 hours', 30, 'scheduled', NULL),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', NULL, now() + interval '4 days' + interval '10 hours', 45, 'scheduled', NULL);

-- ============================================================================
-- DONE — All seed data inserted
-- ============================================================================
