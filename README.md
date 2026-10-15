# Naija Market Hustle

Static game (Abuja edition). Host on GitHub Pages.

## Setup (in this order)
1. Put your Supabase URL and anon key in `config.js`.
2. Supabase > SQL editor: paste and run `supabase/full_setup.sql` (it contains everything below in the right order). Do not run `hardening.sql`.
3. Then run `supabase/friends_rooms.sql` (private free-text chat rooms for friends).
4. Supabase > Authentication: turn on Anonymous sign-ins and add Cloudflare Turnstile captcha.
5. Test with a fresh browser: play 3 days, check the Top tab, send a chat phrase, try a gift.

## What v4 does
- Scores are written only by a server function with growth limits. Leaderboard reads a public view (name, best, tier).
- Chat is ready-made phrases only (database enforces it).
- Gifts tab: send small pretend naira to a friend by 6-character code, limited per day.

- Friends tab: make a private room, share the 6-character code, chat freely (no links, phone numbers or contacts). Public chat stays phrase-only.
