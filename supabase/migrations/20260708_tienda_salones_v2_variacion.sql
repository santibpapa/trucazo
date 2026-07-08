-- ============================================================
-- TIENDA DE SALONES v2 — más variación visual
-- El catálogo inicial era todo del mismo palo (madera/vino). Se renueva:
--   - Se retiran 'bodega' y 'nautico' (muy parecidos al resto).
--   - Entran 'neon' (bar moderno, violeta/cian) y 'rooftop' (terraza
--     nocturna con skyline, azul noche): paletas totalmente distintas.
--   - Se retocan nombre/descripción de los que quedan.
-- Si alguien ya había comprado un salón retirado, se le devuelven las
-- monedas y vuelve al salón clásico. (Correr DESPUÉS de 20260708_tienda_salones.)
-- ============================================================

-- Devolver monedas a quien haya comprado los salones que se retiran
update profiles p
   set coins = p.coins + s.price
  from profile_salons ps
  join salons s on s.slug = ps.salon_slug
 where ps.profile_id = p.id
   and s.slug in ('bodega', 'nautico');

-- Si alguien los tenía en uso, vuelve al clásico
update profiles
   set active_salon = 'clasico'
 where active_salon in ('bodega', 'nautico');

-- Retirarlos (el cascade borra también sus filas de compra)
delete from salons where slug in ('bodega', 'nautico');

-- Catálogo renovado: actualiza los existentes y agrega los nuevos
insert into salons (slug, name, description, price, sort_order) values
  ('clasico',      'Salón Clásico',        'Madera oscura, luz baja y cuero. El de siempre.',                0,    1),
  ('cafetin',      'Cafetín Porteño',      'Mármol, espejos y un bandoneón al fondo. Sepia y nostalgia.',    250,  2),
  ('quincho',      'Quincho de Estancia',  'Ladrillo, brasas encendidas y campo abierto. Fuego y tierra.',   500,  3),
  ('neon',         'Neón Nocturno',        'Bar moderno bañado en neón violeta y cian. Otra época, otro juego.', 800, 4),
  ('rooftop',      'Rooftop Metropolitano','Terraza de noche sobre la ciudad: vidrio, luces y azul profundo.', 1200, 5),
  ('presidencial', 'Salón Presidencial',   'Mármol claro, dorados y araña de cristal. Lujo a plena luz.',    1800, 6)
on conflict (slug) do update
   set name = excluded.name,
       description = excluded.description,
       price = excluded.price,
       sort_order = excluded.sort_order;
