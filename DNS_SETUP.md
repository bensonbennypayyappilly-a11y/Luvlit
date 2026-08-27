# DNS setup for business subdomains (business-name.luvlit.in)

This explains, in plain language, the two things needed so a URL like `alora.luvlit.in` shows that business's page. Neither step is done yet — do these manually when you're ready to launch this feature.

## 1. Add a DNS record at your domain registrar

Wherever `luvlit.in`'s DNS is managed (your domain registrar, or Vercel if you've delegated DNS to them), add one new record:

| Type | Name (host) | Value |
|---|---|---|
| CNAME | `*` | `cname.vercel-dns.com` |

The `*` means "any subdomain" — so `alora.luvlit.in`, `some-cafe.luvlit.in`, etc. all point at the same place without adding a record per business. If your DNS provider doesn't allow a `*` CNAME at the bare domain level (some don't, due to conflicting with existing records like your MX/mail records), Vercel's dashboard (step 2 below) will tell you the exact alternative record to add instead.

## 2. Add the wildcard domain in Vercel

1. Open your project on [vercel.com](https://vercel.com), go to **Settings → Domains**.
2. Add `*.luvlit.in` as a domain (in addition to `luvlit.in` itself, which should already be there).
3. Vercel will show a "pending verification" state until it detects the DNS record from step 1. This can take anywhere from a few minutes to a few hours depending on DNS propagation.

**Note:** wildcard domains are a **Vercel Pro plan feature** — if your project is on the free Hobby plan, you'll need to upgrade before Vercel will accept `*.luvlit.in`.

## How it works once this is live

Every business gets a `slug` (e.g. `alora`) automatically when they finish onboarding. Once the DNS/Vercel setup above is done, visiting `https://alora.luvlit.in/` will show that business's public profile page directly — the app already has this logic built in (it checks the incoming request's Host header and serves the matching business at the root path). Existing `/business/{id}` links will keep working — they now redirect (permanently, so search engines update their index) to the subdomain once a business has a slug.

Nothing else needs to change in the app for this to work once the DNS/Vercel steps above are complete.
