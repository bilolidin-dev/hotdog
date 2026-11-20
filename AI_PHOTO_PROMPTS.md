# AI Food Photography — Статус генерации и точные промпты (в т. ч. бутылки «Напитки» для Оша)

## Текущий статус (блокировка квотой генератора)

Повторная проверка `generate_image` (модель `gemini-3.1-flash-image`) на **`2026-11-20T20:18+06:00`** вернула ошибку квоты:
- `429 Too Many Requests` / `RESOURCE_EXHAUSTED` (`QUOTA_EXHAUSTED`)
- Сообщение API: `You have exhausted your capacity on this model. Your quota will reset after 3h31m5s.` (`quotaResetDelay: 3h31m5.440207568s`).

В соответствии с требованиями проекта:
- Генерация **не имитировалась**, пустые заглушки и вымышленные этикетки **не создавались**, внешние URL **не добавлялись**.
- Существующие WebP-файлы в `assets/images/menu/drinks/` временно оставлены на диске до замены, чтобы в интерфейсе меню не возникало битых картинок (`404` / `naturalWidth === 0`).
- **Важно:** текущие изображения в `assets/images/menu/drinks/` по-прежнему показывают напитки в стаканах и **не прошли** новое требование «пластиковая бутылка с крышкой 1 л / 0,5 л без стаканов».

---

## Категория «Напитки» (9 позиций) — спецификация съёмки и промпты (`4:3`, `800×600`, WebP `q=78–82`)

### Общие требования кадра для всех 9 файлов (`assets/images/menu/drinks/`)
- В кадре строго **1 единица товара** по центру (без стаканов, бокалов, чашек, трубочек, льда вне тары и посторонней еды).
- Чётко видна **заводская крышка / укупорка** и реальные пропорции объёма (`1 литр` vs `0,5 литра`).
- Светлый чистый фон тёплого кафе в стиле остального каталога (например, светлый кремовый камень / матовый светлый стол с мягким студийным светом), без коллажей и водяных знаков.

---

### А. Международные бренды (Coca-Cola, Pepsi, Fanta) — можно сгенерировать после сброса квоты

1. **`assets/images/menu/drinks/drink-cola-1l.webp` (`Кола`, 1 литр)**
   > *A single realistic 1-liter plastic PET bottle of Coca-Cola standing upright in the center on a bright warm cream stone cafe surface in soft natural daylight, wearing its sealed bright red plastic screw cap and authentic red Coca-Cola wrap-around label, authentic 1L contour PET proportions with dark fizzy cola inside and fine condensation droplets. Strictly one bottle in frame, no glasses, no cups, no straws, no food, clean bright soft-focus background, 4:3 product photography.*

2. **`assets/images/menu/drinks/drink-pepsi-1l.webp` (`Пепси`, 1 литр)**
   > *A single realistic 1-liter plastic PET bottle of Pepsi standing upright centered on a bright warm cream stone surface in soft studio daylight, sealed blue plastic screw cap, authentic blue Pepsi logo wrap-around label, real 1-liter bottle proportions with dark fizzy cola inside and subtle cold condensation. Strictly one bottle, no glasses, no cups, no straws, no food, 4:3 product photography.*

3. **`assets/images/menu/drinks/drink-cola-05l.webp` (`Кола`, 0,5 литра)**
   > *A single compact 0.5-liter (500 ml) plastic PET bottle of Coca-Cola centered upright on a bright warm cream tabletop in natural daylight, shorter slim 500ml PET bottle proportions compared to 1L, sealed red plastic screw cap clearly visible, authentic red Coca-Cola label, chilled dark cola inside with light condensation. Strictly one 0.5L bottle, no glasses, no straws, no other items, 4:3 product photography.*

4. **`assets/images/menu/drinks/drink-pepsi-05l.webp` (`Пепси`, 0,5 литра)**
   > *A single compact 0.5-liter (500 ml) plastic PET bottle of Pepsi centered upright on a bright warm cream surface in soft daylight, compact 500ml PET bottle proportions, sealed blue plastic cap clearly visible, authentic Pepsi label, chilled dark cola inside with delicate condensation beads. Strictly one 0.5L bottle, no glasses, no cups, no straws, no food, 4:3 product photography.*

5. **`assets/images/menu/drinks/drink-fanta-1l.webp` (`Фанта`, 1 литр)**
   > *A single realistic 1-liter clear plastic PET bottle of Fanta Orange centered upright on a bright warm cream surface in natural studio daylight, authentic 1L twisted lower-rib PET bottle shape filled with bright vibrant orange soda, sealed bright orange plastic screw cap clearly visible and authentic Fanta Orange wrap-around label. Strictly one 1L bottle, no glasses, no straws, no food, 4:3 product photography.*

---

### Б. Локальные / региональные бренды Кыргызстана и СНГ (Дена, Динай, Dizzy, Gorilla) — требуются реальные фото-референсы упаковки

> **Предупреждение:** дизайн этикеток и форма тары брендов **Дена сок**, **Динай**, **Dizzy** и **Gorilla** в Кыргызстане имеют конкретный заводской вид, который нельзя выдумывать. Перед генерацией AI (image-to-image с референсом) либо заменой на реальные фото из холодильника кафе необходимо учесть фактическую упаковку на рынке Оша/Кыргызстана:

6. **`assets/images/menu/drinks/drink-dena-1l.webp` (`Дена сок`, 1 литр)**
   - **Факт упаковки по рынку KG/UZ:** соки «Dena» объёмом 1 литр стандартно выпускаются в **картонном пакете Tetra Pak 1 л с пластиковой крышкой сверху**, а не в прозрачной ПЭТ-бутылке.
   - **Рекомендация:** использовать реальное фото/официальный пакшот (или уточнить у владельца, какой вкус подаётся в кафе — персик/апельсин/мультифрукт/яблоко — и есть ли у них именно 1L Tetra Pak).
   - **Промпт (только при наличии загруженного фото-референса реальной пачки Dena 1L):**
     > *Clean commercial product photograph based strictly on the provided reference image of a real 1-liter Dena juice carton (Tetra Pak with plastic screw cap visible on top), placed upright in the center on a warm cream cafe surface in soft natural daylight. Preserve exact original Dena brand logo, colors, fruit graphics and cap; strictly one package, no glasses, no straws, 4:3 aspect ratio.*

7. **`assets/images/menu/drinks/drink-dinay-1l.webp` (`Динай`, 1 литр)**
   - **Факт упаковки по рынку KG:** напиток «Dinay» (Динай) реально выпускается в **ПЭТ-бутылке 1 литр** с винтовой крышкой и круговой термоусадочной фруктовой этикеткой (вкусы: апельсин, яблоко, клубника-яблоко, мультифрукт и др.).
   - **Рекомендация:** загрузить фото реальной бутылки Динай из точки продаж (уточнив основной вкус для карточки) и сгенерировать/обработать без искажения логотипа «Dinay».
   - **Промпт (только при наличии фото-референса реальной бутылки Dinay 1L):**
     > *Single real 1-liter plastic PET bottle of Dinay fruit drink based strictly on the provided official reference bottle (preserving the exact Dinay sleeve label, fruit artwork and plastic screw cap), standing upright centered on a bright warm cream stone surface in soft studio daylight. Strictly one 1L PET bottle, no glasses, no cups, no straws, no food, 4:3 aspect ratio.*

8. **`assets/images/menu/drinks/drink-dizzy.webp` (`Энергетик Dizzy`, объём не указан)**
   - **Факт упаковки по рынку KZ/KG:** классический *энергетик* Dizzy продаётся в **прозрачной стеклянной бутылке 0,33 л** с металлической крышкой или в **алюминиевой банке 0,45–0,5 л** (ПЭТ-бутылки у бренда Dizzy относятся к обычным лимонадам, а не к энергетикам).
   - **Рекомендация:** уточнить у владельца точную тару и вкус энергетика Dizzy (стекло 0,33 л Original или банка 0,45/0,5 л) и использовать реальное фото бутылки/банки как референс.
   - **Промпт (после подтверждения тары и с фото-референсом):**
     > *Single original Dizzy Energy drink bottle/can strictly matching the provided official product reference (preserving the authentic Dizzy logo, cap/top and original label artwork), standing upright centered on a warm cream cafe surface in natural daylight with subtle chilled condensation. Strictly one item, no glasses, no straws, no food, 4:3 aspect ratio.*

9. **`assets/images/menu/drinks/drink-gorilla.webp` (`Gorilla`, объём не указан)**
   - **Факт упаковки по рынку KG:** энергетик **Gorilla Energy** выпускается в **алюминиевых банках** (обычно **0,45 л**), а не в пластиковых ПЭТ-бутылках.
   - **Рекомендация:** уточнить у владельца фактическую тару и вкус Gorilla в кафе и использовать официальное/реальное фото банки в качестве референса (вместо выдуманной пластиковой бутылки).
   - **Промпт (при использовании реального фото-референса Gorilla):**
     > *Single original Gorilla Energy can strictly matching the provided official reference packaging (preserving exact Gorilla logo, typography and original dark/green/berry can finish), standing upright centered on a bright warm cream stone surface in natural studio daylight with fine condensation droplets. Strictly one product in frame, no glasses, no straws, no invented PET plastic bottle, 4:3 aspect ratio.*

---

## Комбо-наборы, ожидающие перегенерации (после сброса квоты)

1. **`assets/images/menu/combos/combo-family.webp` (`Семейное комбо` — 1490 сом)** *(предыдущий кандидат отклонён из-за сплит-коллажа)*:
   > *Single cohesive overhead 45-degree restaurant table photograph (strictly NO split panels, NO collage): a wide wooden dining table holding one long dark slate sushi platter with 5 distinct roll varieties (creamy gentle cold roll, baked orange California, cucumber mini maki, classic orange tobiko California, crispy chicken tempura roll) beside ONE hot round Pepperoni pizza and soy bowls in warm natural daylight, no hotdog, no fries, no text, no logos.*
2. **`assets/images/menu/combos/combo-beyishim-apam.webp` (`Бейишим апам` — 2400 сом)**:
   > *Lavish cohesive restaurant feast overhead-45 photograph (NO collage): two full round pizzas side-by-side — one creamy roasted chicken Caesar pizza with fresh romaine and parmesan shavings, one classic Pepperoni pizza — beside a large rectangular platter displaying TWO separate portions of baked chicken sushi rolls, baked California, fried rolls, cucumber kappa maki, and chicken rolls with chopsticks and soy dishes, warm daylight, no text, no logos.*
