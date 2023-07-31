# Superflows

Superflows adds a Copilot to your SaaS product to help your users get the most out of it.

## Status

- [x] **Alpha**: Not ready for use on production systems.
- [ ] **Beta**: Ready for use on production systems, but not yet considered stable.
- [ ] **Stable**: Ready for use on production systems.

## Installation

```bash
npm i
```

## Development

You need to be running a local version of [Supabase](https://supabase.io) to develop this project locally.

[Here are comprehensive instructions on using the Supabase CLI](https://supabase.com/docs/guides/cli)

(note: if you have used Supabase in other projects before, you may have to `supabase stop` before running `supabase start`)


**If using `npm`**

```bash
npm install supabase --save-dev
npx supabase start
```
The 2nd command should give you an `anon_api_key` and a `service_role` key.

You'll need to enter these into the `.env` file. Check out `.env.example` for the format and variables required.

Once you fill in `.env.example`, rename it `.env`.

To run in development mode:

```bash
make run
```

(Alternatively, if you don't have `make`, use `npm run dev`)

## Using the API

See the API spec [here](https://docs.superflows.ai/docs/category/api-specification).

