# F7 · Speed from the finger

**Action:** swipe across the night sky, fast and then slowly.

**Response:** speed lines appear in proportion to the swipe's speed (none under 300 px/s, up to 24) and the whole stage shakes a few pixels on a very fast swipe (none under 600 px/s, at most 6 px). Both fade out half a second after you let go.

**Feeling:** your finger is the engine; flicking feels fast because the world agrees.

**Data:** none.

**Cost:** a pool of 24 elements, no per-frame allocation, one fade tween on release. Under reduced motion it shows a note and does nothing.

**Kill if:** the shake feels like a bug, or the lines hide what is on screen.
