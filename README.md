# Superflows

Superflows makes it easy to add an AI assistant to a software product. This lets users ask questions in natural language and the assistant makes API calls to answer them.

E.g. a CRM user could ask: "What's the status of the B Corp deal?". A product analytics tool user could ask: "What did users think of the recent UI change?".

[Demo video](https://dashboard.superflows.ai/demo.mp4)

You can try out the cloud version for free [**here**](https://dashboard.superflows.ai) or self-host. You can learn more on our [documentation pages](https://docs.superflows.ai/).

## Features

- Developer dashboard to configure and test your product assistant
- Public streaming API
- Answers in the same language the question is asked in
- UI components (find React components [here](https://github.com/Superflows-AI/chat-ui))

## Setup

Setup involves three steps:

1. Upload API specification
2. Test in the playground
3. Integrate into your product in a few lines of code

### Roadmap

[Available here.](https://docs.superflows.ai/blog/roadmap)

## Development

You need to be running a local version of [Supabase](https://supabase.io) to develop this project locally.

[Here are comprehensive instructions on using the Supabase CLI](https://supabase.com/docs/guides/cli)

(note: if you have used Supabase in other projects before, you may have to `supabase stop` before running `supabase start`)

**If using `npm`**

```bash
npm i
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

