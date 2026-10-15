# Naija Market Hustle

Static game (Abuja edition). Host on GitHub Pages.

## Setup (in this order)
1. Put your Supabase URL and anon key in `config.js`.
2. Supabase > SQL editor: run `supabase/chat_moderation.sql`, then `supabase/v4_scores_gifts.sql`. (`hardening.sql` is replaced by v4.)
3. Supabase > Authentication: turn on Anonymous sign-ins and add Cloudflare Turnstile captcha.
4. Test with a fresh browser: play 3 days, check the Top tab, send a chat phrase, try a gift.

## What v4 does
- Scores are written only by a server function with growth limits. Leaderboard reads a public view (name, best, tier).
- Chat is ready-made phrases only (database enforces it).
- Gifts tab: send small pretend naira to a friend by 6-character code, limited per day.
