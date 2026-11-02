# F6 · Pull the cord

**Action:** pull the tassel at the top of the screen down, then let go.

**Response:** the cord stretches with growing resistance (it never goes more than 140 px). Let go past 90 px of finger travel and a temple bell rings with a short buzz and the words 次は… NEXT STOP appear. Let go earlier and it springs back silently.

**Feeling:** you rang for the next stop like a real train.

**Data:** none.

**Cost:** one requestAnimationFrame loop only while it springs back. Under reduced motion a tap on the tassel shows the label, with no motion, sound or vibration.

**Kill if:** the resistance feels sticky, or people do not discover the tassel without being told.
