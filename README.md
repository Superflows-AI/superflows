# Superflows

Superflows makes it easy to add an AI assistant to a software product. This lets users ask questions in natural language and the assistant makes API calls to answer them.

E.g. a CRM user could ask: "What's the status of the B Corp deal?". A product analytics tool user could ask: "What did users think of the recent UI change?".

<div style="position: relative; padding-bottom: 62.5%; height: 0;"><iframe src="https://www.loom.com/embed/cb8254e6a6414f9980fd8362368f4010?sid=f1b2df57-7f89-4213-a926-760eb468eeac" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

[//]: # (![Superflows-in-action]&#40;./public/superflows-in-action.gif&#41;)

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

