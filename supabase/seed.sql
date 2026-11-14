-- Seed Data for Northern Flavors Restaurant
-- Categories & Authentic Northern/Nigerian Menu Items

-- 1. Insert Categories
INSERT INTO public.categories (id, name, slug, description, sort_order, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Rice', 'rice', 'Savory, aromatic Nigerian rice dishes cooked to perfection', 1, true),
    ('c0000000-0000-0000-0000-000000000002', 'Swallow', 'swallow', 'Traditional swallow dishes served hot and smooth', 2, true),
    ('c0000000-0000-0000-0000-000000000003', 'Proteins', 'proteins', 'Succulent beef, seasoned chicken, fresh fish and tender turkey', 3, true),
    ('c0000000-0000-0000-0000-000000000004', 'Sides', 'sides', 'Delectable side accompaniments to enrich your plate', 4, true),
    ('c0000000-0000-0000-0000-000000000005', 'Meals', 'meals', 'Authentic Northern regional delicacies and full combo platters', 5, true),
    ('c0000000-0000-0000-0000-000000000006', 'Snacks', 'snacks', 'Freshly baked pastries and crispy appetizers', 6, true),
    ('c0000000-0000-0000-0000-000000000007', 'Drinks', 'drinks', 'Chilled homemade beverages, natural juices and refreshments', 7, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Menu Products
INSERT INTO public.products (
    id, category_id, name, slug, description, price, cost_price, sku,
    stock_quantity, low_stock_threshold, track_stock, is_available, is_featured, is_favourite, sort_order
)
VALUES
    -- Rice
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'Signature Jollof Rice', 'signature-jollof-rice',
     'Smoky firewood-style Nigerian party Jollof rice infused with tomatoes, sweet bell peppers and Northern spices.',
     1800.00, 950.00, 'RICE-JOL-01', 50, 10, true, true, true, true, 1),

    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
     'Special Fried Rice', 'special-fried-rice',
     'Stir-fried parboiled rice with sweet corn, carrots, peas, liver and fragrant seasoning.',
     2000.00, 1100.00, 'RICE-FRD-02', 35, 8, true, true, false, true, 2),

    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
     'White Rice & Native Stew', 'white-rice-native-stew',
     'Fluffy steamed white rice served with deep, rich red pepper and tomato meat stew.',
     1600.00, 800.00, 'RICE-WHT-03', 40, 10, true, true, false, false, 3),

    -- Swallow
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002',
     'Tuwon Shinkafa', 'tuwon-shinkafa',
     'Classic soft Northern rice swallow, smooth and comforting, pairs wonderfully with Miyan Taushe or Egusi.',
     1200.00, 500.00, 'SWL-TSH-01', 30, 8, true, true, true, true, 4),

    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002',
     'Semovita', 'semovita',
     'Silky, finely-kneaded premium semolina swallow.',
     1200.00, 550.00, 'SWL-SEM-02', 25, 5, true, true, false, false, 5),

    ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002',
     'Pounded Yam', 'pounded-yam',
     'Elastic, hot pounded yam with a soft velvety texture.',
     1500.00, 700.00, 'SWL-PYM-03', 25, 5, true, true, false, true, 6),

    -- Proteins
    ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003',
     'Peppered Fried Chicken', 'peppered-fried-chicken',
     'Crispy golden chicken tossed in hot scotch bonnet, red pepper glaze, and caramelized onions.',
     2500.00, 1400.00, 'PRO-CHK-01', 30, 8, true, true, true, true, 7),

    ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000003',
     'Spicy Northern Beef Suya', 'spicy-northern-beef-suya',
     'Thinly sliced tender prime beef crusted in authentic Jigawa yaji spice, charred to smoky bliss.',
     2200.00, 1200.00, 'PRO-SYA-02', 40, 10, true, true, true, true, 8),

    ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003',
     'Fried Titus Fish', 'fried-titus-fish',
     'Deep-fried marinated mackerel steak seasoned with garlic, ginger, and herbs.',
     2000.00, 1100.00, 'PRO-FSH-03', 20, 5, true, true, false, false, 9),

    -- Sides
    ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000004',
     'Sweet Fried Plantain (Dodo)', 'sweet-fried-plantain-dodo',
     'Caramelized sweet ripe plantain slices fried golden brown.',
     800.00, 350.00, 'SID-PLA-01', 40, 10, true, true, false, true, 10),

    ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000004',
     'Rich Moi Moi', 'rich-moi-moi',
     'Steamed savory bean pudding packed with flaked fish, boiled egg, and native peppers.',
     900.00, 450.00, 'SID-MMI-02', 25, 5, true, true, false, false, 11),

    -- Meals
    ('d0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000005',
     'Masa with Miyan Taushe', 'masa-with-miyan-taushe',
     'Fermented puffed rice cakes (waina) served alongside sweet pumpkin and peanut soup with beef chunks.',
     3000.00, 1600.00, 'MEL-MAS-01', 20, 5, true, true, true, true, 12),

    ('d0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000005',
     'Egusi Soup with Assorted Meat', 'egusi-soup-assorted-meat',
     'Rich ground melon seed soup cooked with spinach, stockfish, cow leg, and tender beef.',
     3200.00, 1800.00, 'MEL-EGU-02', 20, 5, true, true, true, false, 13),

    -- Snacks
    ('d0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000006',
     'Golden Meat Pie', 'golden-meat-pie',
     'Flaky, buttery shortcrust pastry filled with minced beef, potatoes, and diced carrots.',
     1000.00, 450.00, 'SNK-MTP-01', 35, 8, true, true, false, true, 14),

    ('d0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000006',
     'Crispy Spring Rolls & Samosa (Pair)', 'spring-rolls-samosa-pair',
     'Crunchy pastry rolls and samosas stuffed with seasoned vegetables and chicken.',
     1200.00, 550.00, 'SNK-SAM-02', 30, 8, true, true, false, false, 15),

    -- Drinks
    ('d0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000007',
     'Chilled Hibiscus Zobo', 'chilled-hibiscus-zobo',
     'Freshly brewed hibiscus petal tea infused with ginger, cloves, and pineapple sweetness.',
     800.00, 300.00, 'DRK-ZOB-01', 50, 15, true, true, true, true, 16),

    ('d0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000007',
     'Creamy Kunu Aya (Tiger Nut Milk)', 'creamy-kunu-aya',
     'Naturally sweet and creamy tiger nut, date, and coconut milk, chilled to refresh.',
     1000.00, 450.00, 'DRK-KUN-02', 40, 10, true, true, true, true, 17),

    ('d0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-000000000007',
     'Signature Chapman', 'signature-chapman',
     'Classic Nigerian cocktail blend with aromatic bitters, citrus slices, and cucumber garnish.',
     1500.00, 600.00, 'DRK-CHP-03', 25, 8, true, true, false, true, 18)
ON CONFLICT (id) DO NOTHING;

-- 3. Delivery Settings Seed
INSERT INTO public.delivery_settings (name, delivery_fee, is_active)
VALUES
    ('Dutse Urban (Yalwawa, Gajambe, Takur)', 1000.00, true),
    ('Dutse Outer (FUD Campus, G9, Limawa)', 1500.00, true),
    ('Express Delivery', 2000.00, true)
ON CONFLICT DO NOTHING;

