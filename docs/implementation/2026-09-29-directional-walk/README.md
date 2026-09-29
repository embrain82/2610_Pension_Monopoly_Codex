# Five-character directional board walking

Approved behavior: B-style walking at 1.5x for Olli, Woni, Danji, Dalli and Kori. Face the travel direction on each edge; hold position while turning for exactly 100ms at crossed corners. Before departure and after arrival/cancellation, show the existing front-facing static character. A move ending on a corner does not turn until a later departure needs that direction.

Assets in `public/assets/characters/directional-walk/` are the 40 transparent WebP atlases and five manifests derived from the reviewed Higgsfield footage. Only the selected character loads (about 1–1.8MB compressed). Woni's manifest scale preserves the reviewed body size and wing clearance. Raw generation footage, API credentials and local review tools are not part of this release.

The controller preserves gait across tile renders. Cancelled or hidden-tab movement returns to static art. Asset failure and reduced-motion preferences retain the existing fallback. The financial engine, dice outcomes and visit state are unchanged; the turn commits once after travel and tile reveal.

Validation: controller tests cover 1.5x playback, fixed 100ms turns, four edges, wraparound, failed loading, stale avatar loads, disabled motion and stop during loading. Game-level tests cover corner timing, single financial commit and cancellation during a turn. Local browser verified real dice movement using directional canvas playback and front-facing arrival.
