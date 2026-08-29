# Supabase setup — what you need to do

The app code is fully wired for Supabase. There are a few things only you can do
(they involve creating an account and pasting keys). It takes ~10 minutes. Follow
these in order.

---

## 1. Create a Supabase project

1. Go to https://supabase.com and sign up (GitHub or email — free tier is plenty).
2. Click **New project**. Pick any name (e.g. "pickleball"), a database password
   (save it in your password manager — you won't need it for this app, but Supabase
   requires one), and a region near you.
3. Wait ~2 minutes for it to provision.

## 2. Copy your two keys into the app

1. In your project, go to **Project Settings** (gear icon) → **API**.
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** (may be labeled **publishable key**) — a long string.
     ⚠️ Do NOT use the `service_role` / secret key — that one must never go in a client app.
3. Open the project's `.env` file (in the repo root) and fill them in:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ....your-anon-key....
   ```

   (These two are safe to expose in a client app — the database's row-level security is
   what actually protects your data. The `.env` file is gitignored regardless.)

## 3. Create the database tables

1. In Supabase, open **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_init.sql` from this repo, copy the whole file, paste it
   into the SQL editor, and click **Run**.
3. You should see "Success. No rows returned." This creates the tables, security rules,
   booking functions, and seed data (one club, events, a roster, and sample bookings).

## 4. Allow the app's URL as a sign-in redirect

The app signs you in with a **magic link** emailed to you (passwordless — uses Supabase's
default email, no template editing needed). You just need to tell Supabase it's OK to send
you back to the local app after you click the link:

1. Go to **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, click **Add URL** and enter:

   ```
   http://localhost:8081
   ```

3. (Optional) Set **Site URL** to `http://localhost:8081` too.
4. Save.

> Note: on the free tier Supabase's built-in email is rate-limited (a few messages per
> hour) — fine for testing. Real email volume later means plugging in an SMTP provider.

## 5. Sign in

The dev server is already running (I restart it for you when needed).

1. Open http://localhost:8081 — you should see the **sign-in screen** (🎾) instead of
   "Connect Supabase". (If it still says "Connect Supabase", the `.env` keys weren't picked
   up — tell me and I'll restart the server.)
2. Enter your email → click **Send sign-in link** → check your inbox → **click the link**.
3. The link opens the app and signs you in automatically.
4. Your first sign-in automatically creates your member profile in the club, so you'll
   appear in **Members**, and you can **Book** sessions on **Schedule** for real.

---

## What to hand back to me

Once you've done step 1–4, just tell me **"keys are in"** (you don't need to paste the
keys — they're in your local `.env`). I'll restart the server and we'll test the live
sign-in and booking flow together. If anything errors, paste the message and I'll fix it.

## Troubleshooting

- **Still says "Connect Supabase"** → the `.env` values are blank or the server wasn't
  restarted after editing `.env` (env changes need a restart).
- **No email** → check spam; free-tier rate limits may delay repeated attempts.
- **Clicking the link shows an error / doesn't sign you in** → the redirect URL isn't
  allowed. Re-check step 4 (`http://localhost:8081` must be in **Redirect URLs**).
- **Data won't load after sign-in** → make sure step 3 (the SQL) ran without errors.
