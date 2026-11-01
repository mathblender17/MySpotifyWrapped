# F8 · One gesture grammar

**Action:** tap, hold, flick, or shake the phone.

**Response:** the card names what you just did in kanji and English: 突く poke, 溜める charge, 弾く flick, 引く pull, 滑らす drag, 振る shake. A hold grows a ring, a flick slides the card away and back, a shake bursts confetti.

**Feeling:** the rules are the same everywhere, so you learn them by doing.

**Data:** none.

**Cost:** pointer events plus one devicemotion listener (shake needs two hard samples in a row, above 15 m/s²). iOS asks for motion permission inside the first tap; without it the three pointer gestures still work. Reduced motion names the gesture and does nothing else.

**Kill if:** the names do not match what people think they did.
