## Plan to support Produto v2 in Establishment.tsx

1. Update `EstablishmentPage` to handle new product fields (promotional_price, product_images, product_option_groups) fetched from Supabase.
2. Implement helper logic for:
   - Primary image selection: `product_images` (where `is_primary: true`) -> `products.image` -> fallback placeholder.
   - Gallery images: show extra `product_images` if available and permitted.
   - Price calculation: promotional logic (v2 price, legacy promo boolean).
   - Availability checks: use `is_available` and `is_active` flags.
3. Update product UI in `EstablishmentPage`:
   - Display promotional badges and strikethrough original prices.
   - Show status badges for unavailability.
4. Update product add-to-cart logic in `EstablishmentPage`:
   - Support `product_option_groups` (v2) and legacy `options` (v1).
   - Validate requirements for groups (`min_choices`/`max_choices`) before adding.
   - Capture snapshot of selected items correctly for the cart state.
