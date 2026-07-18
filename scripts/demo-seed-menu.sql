-- ============================================================================
-- Harbor House Kitchen — real menu
--
-- Not cosmetic: `submit_order` prices line items by looking up menu_items by
-- name. With an empty menu every order totalled $0.00. Seeding this makes the
-- ordering flow (and every total shown in Operations) actually correct.
--
-- Idempotent: deterministic UUIDs + ON CONFLICT DO NOTHING. Safe to re-run.
-- Tenant: Harbor House Kitchen (restaurant).
-- ============================================================================

\set tenant '''c8460639-2c35-480f-8b2f-c7b425740207'''

-- ── Menu ────────────────────────────────────────────────────────────────────
INSERT INTO restaurant_menus (id, tenant_id, name, description, is_active)
VALUES ('d0000000-0000-4000-8000-000000000001', :tenant::uuid, 'Main Menu',
        'Coastal American cooking — served all day.', true)
ON CONFLICT (id) DO NOTHING;

-- ── Categories ──────────────────────────────────────────────────────────────
INSERT INTO menu_categories (id, menu_id, tenant_id, name, description, sort_order, is_active) VALUES
 ('d0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000001', :tenant::uuid, 'Starters',  'Small plates and raw bar',        1, true),
 ('d0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000001', :tenant::uuid, 'Pizzas',    'Wood-fired, 12 inch',             2, true),
 ('d0000000-0000-4000-8000-000000000103', 'd0000000-0000-4000-8000-000000000001', :tenant::uuid, 'Pastas',    'Made in house daily',             3, true),
 ('d0000000-0000-4000-8000-000000000104', 'd0000000-0000-4000-8000-000000000001', :tenant::uuid, 'Mains',     'From the grill and the sea',      4, true),
 ('d0000000-0000-4000-8000-000000000105', 'd0000000-0000-4000-8000-000000000001', :tenant::uuid, 'Desserts',  'House made',                      5, true),
 ('d0000000-0000-4000-8000-000000000106', 'd0000000-0000-4000-8000-000000000001', :tenant::uuid, 'Drinks',    'Soft drinks, beer and wine',      6, true)
ON CONFLICT (id) DO NOTHING;

-- ── Items ───────────────────────────────────────────────────────────────────
-- allergens/dietary_tags are TEXT[]; price_cents is an integer.
INSERT INTO menu_items
  (id, category_id, tenant_id, name, description, price_cents, calories, allergens, dietary_tags, is_available, sort_order)
VALUES
 -- Starters
 ('d0000000-0000-4000-8000-000000000201','d0000000-0000-4000-8000-000000000101',:tenant::uuid,'New England Clam Chowder','Creamy chowder with smoked bacon and fresh thyme.',1200, 420,'{dairy,shellfish,gluten}','{}',true,1),
 ('d0000000-0000-4000-8000-000000000202','d0000000-0000-4000-8000-000000000101',:tenant::uuid,'Garlic Knots','Six knots, roasted garlic butter, parmesan.',900, 560,'{gluten,dairy}','{vegetarian}',true,2),
 ('d0000000-0000-4000-8000-000000000203','d0000000-0000-4000-8000-000000000101',:tenant::uuid,'Calamari Fritti','Lightly fried, lemon aioli, pickled chili.',1650, 610,'{shellfish,gluten,eggs}','{}',true,3),
 ('d0000000-0000-4000-8000-000000000204','d0000000-0000-4000-8000-000000000101',:tenant::uuid,'Oysters on the Half Shell','Half dozen, mignonette, cocktail sauce.',1900, 90,'{shellfish}','{gluten_free}',true,4),
 ('d0000000-0000-4000-8000-000000000205','d0000000-0000-4000-8000-000000000101',:tenant::uuid,'Harbor Caesar','Little gem, focaccia croutons, white anchovy.',1400, 380,'{gluten,dairy,eggs,fish}','{vegetarian}',true,5),
 ('d0000000-0000-4000-8000-000000000206','d0000000-0000-4000-8000-000000000101',:tenant::uuid,'Crispy Brussels Sprouts','Maple, chili flake, toasted almond.',1100, 310,'{nuts}','{vegetarian,gluten_free}',true,6),
 -- Pizzas
 ('d0000000-0000-4000-8000-000000000211','d0000000-0000-4000-8000-000000000102',:tenant::uuid,'Large Pepperoni Pizza','Twelve inch, mozzarella, cup-and-char pepperoni.',2200, 1120,'{gluten,dairy}','{}',true,1),
 ('d0000000-0000-4000-8000-000000000212','d0000000-0000-4000-8000-000000000102',:tenant::uuid,'Margherita Pizza','San Marzano, fior di latte, basil.',1900, 980,'{gluten,dairy}','{vegetarian}',true,2),
 ('d0000000-0000-4000-8000-000000000213','d0000000-0000-4000-8000-000000000102',:tenant::uuid,'White Clam Pizza','Littleneck clams, garlic, pecorino, oregano.',2400, 1010,'{gluten,dairy,shellfish}','{}',true,3),
 ('d0000000-0000-4000-8000-000000000214','d0000000-0000-4000-8000-000000000102',:tenant::uuid,'Garden Veggie Pizza','Zucchini, peppers, red onion, olives.',2100, 890,'{gluten,dairy}','{vegetarian}',true,4),
 ('d0000000-0000-4000-8000-000000000215','d0000000-0000-4000-8000-000000000102',:tenant::uuid,'Gluten-Free Cheese Pizza','Ten inch gluten-free crust, mozzarella, tomato.',2000, 820,'{dairy}','{vegetarian,gluten_free}',true,5),
 -- Pastas
 ('d0000000-0000-4000-8000-000000000221','d0000000-0000-4000-8000-000000000103',:tenant::uuid,'Linguine alle Vongole','Littleneck clams, white wine, garlic, parsley.',2600, 760,'{gluten,shellfish}','{}',true,1),
 ('d0000000-0000-4000-8000-000000000222','d0000000-0000-4000-8000-000000000103',:tenant::uuid,'Lobster Ravioli','Brown butter, tarragon, lemon.',3200, 890,'{gluten,dairy,shellfish,eggs}','{}',true,2),
 ('d0000000-0000-4000-8000-000000000223','d0000000-0000-4000-8000-000000000103',:tenant::uuid,'Cacio e Pepe','Pecorino romano, cracked black pepper.',2100, 720,'{gluten,dairy}','{vegetarian}',true,3),
 ('d0000000-0000-4000-8000-000000000224','d0000000-0000-4000-8000-000000000103',:tenant::uuid,'Rigatoni Bolognese','Slow-cooked beef and pork ragu.',2400, 940,'{gluten,dairy}','{}',true,4),
 ('d0000000-0000-4000-8000-000000000225','d0000000-0000-4000-8000-000000000103',:tenant::uuid,'Penne Primavera','Seasonal vegetables, olive oil, basil.',1900, 640,'{gluten}','{vegetarian,vegan}',true,5),
 -- Mains
 ('d0000000-0000-4000-8000-000000000231','d0000000-0000-4000-8000-000000000104',:tenant::uuid,'Pan-Seared Scallops','Sweet corn puree, crispy pancetta.',3400, 580,'{shellfish,dairy}','{gluten_free}',true,1),
 ('d0000000-0000-4000-8000-000000000232','d0000000-0000-4000-8000-000000000104',:tenant::uuid,'Grilled Atlantic Salmon','Lemon herb butter, seasonal vegetables.',2900, 620,'{fish,dairy}','{gluten_free}',true,2),
 ('d0000000-0000-4000-8000-000000000233','d0000000-0000-4000-8000-000000000104',:tenant::uuid,'Fish and Chips','Beer-battered cod, malt vinegar, tartar.',2400, 1080,'{fish,gluten,eggs,dairy}','{}',true,3),
 ('d0000000-0000-4000-8000-000000000234','d0000000-0000-4000-8000-000000000104',:tenant::uuid,'Harbor Burger','Aged cheddar, house pickles, brioche bun.',2100, 990,'{gluten,dairy,eggs}','{}',true,4),
 ('d0000000-0000-4000-8000-000000000235','d0000000-0000-4000-8000-000000000104',:tenant::uuid,'Lobster Roll','Warm butter-poached lobster, split-top roll.',3600, 720,'{shellfish,gluten,dairy}','{}',true,5),
 ('d0000000-0000-4000-8000-000000000236','d0000000-0000-4000-8000-000000000104',:tenant::uuid,'Roast Half Chicken','Lemon, garlic, pan jus, potatoes.',2700, 850,'{}','{gluten_free}',true,6),
 ('d0000000-0000-4000-8000-000000000237','d0000000-0000-4000-8000-000000000104',:tenant::uuid,'Steak Frites','Ten ounce sirloin, herb butter, fries.',3800, 1140,'{dairy}','{gluten_free}',true,7),
 -- Desserts
 ('d0000000-0000-4000-8000-000000000241','d0000000-0000-4000-8000-000000000105',:tenant::uuid,'Key Lime Pie','Graham crust, torched meringue.',1000, 480,'{gluten,dairy,eggs}','{vegetarian}',true,1),
 ('d0000000-0000-4000-8000-000000000242','d0000000-0000-4000-8000-000000000105',:tenant::uuid,'Warm Chocolate Cake','Molten centre, vanilla gelato.',1200, 690,'{gluten,dairy,eggs}','{vegetarian}',true,2),
 ('d0000000-0000-4000-8000-000000000243','d0000000-0000-4000-8000-000000000105',:tenant::uuid,'Lemon Sorbet','Dairy free, fresh mint.',800, 180,'{}','{vegan,gluten_free}',true,3),
 ('d0000000-0000-4000-8000-000000000244','d0000000-0000-4000-8000-000000000105',:tenant::uuid,'Blueberry Cheesecake','New York style, blueberry compote.',1100, 620,'{gluten,dairy,eggs}','{vegetarian}',true,4),
 -- Drinks
 ('d0000000-0000-4000-8000-000000000251','d0000000-0000-4000-8000-000000000106',:tenant::uuid,'Fountain Soda','Free refills in house.',400, 150,'{}','{vegan,gluten_free}',true,1),
 ('d0000000-0000-4000-8000-000000000252','d0000000-0000-4000-8000-000000000106',:tenant::uuid,'Fresh Lemonade','Squeezed to order.',600, 190,'{}','{vegan,gluten_free}',true,2),
 ('d0000000-0000-4000-8000-000000000253','d0000000-0000-4000-8000-000000000106',:tenant::uuid,'Iced Tea','Unsweetened or sweet.',400, 90,'{}','{vegan,gluten_free}',true,3),
 ('d0000000-0000-4000-8000-000000000254','d0000000-0000-4000-8000-000000000106',:tenant::uuid,'Local Draft Beer','Rotating New England taps, sixteen ounce.',900, 210,'{gluten}','{vegetarian}',true,4),
 ('d0000000-0000-4000-8000-000000000255','d0000000-0000-4000-8000-000000000106',:tenant::uuid,'House Red Wine','Glass of the house cabernet.',1200, 160,'{}','{vegan,gluten_free}',true,5),
 ('d0000000-0000-4000-8000-000000000256','d0000000-0000-4000-8000-000000000106',:tenant::uuid,'House White Wine','Glass of the house sauvignon blanc.',1200, 150,'{}','{vegan,gluten_free}',true,6),
 ('d0000000-0000-4000-8000-000000000257','d0000000-0000-4000-8000-000000000106',:tenant::uuid,'Sparkling Water','Large bottle.',500, 0,'{}','{vegan,gluten_free}',true,7)
ON CONFLICT (id) DO NOTHING;

-- ── CLEANUP (uncomment to remove everything this file seeded) ───────────────
-- DELETE FROM menu_items      WHERE id::text LIKE 'd0000000-0000-4000-8000-0000000002%';
-- DELETE FROM menu_categories WHERE id::text LIKE 'd0000000-0000-4000-8000-0000000001%';
-- DELETE FROM restaurant_menus WHERE id = 'd0000000-0000-4000-8000-000000000001';
