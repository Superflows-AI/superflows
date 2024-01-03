<br>
<p align="center">
  <a href="https://www.superflows.ai">
    <img src="public/sf-logo-long.png" width="250px" alt="Superflows Logo" />
  </a>
</p>

<h2 align="center" >Open Source alternative to OpenAI Assistants API</h3>
<p align="center"></p>

<p align="center"><a href="https://superflows.ai/crm-demo">🎮 Demo</a> · <a href="https://superflows.ai">🌐 Website</a> · <a href="https://docs.superflows.ai">📚 Docs</a> · <a href="https://join.slack.com/t/superflowsusers/shared_invite/zt-1zf93teqq-0I9H_niiGruVDPFVSzGj9w">💬 Slack</a> ·  <a href="https://github.com/Superflows-AI/chat-ui">🖥 React Components</a></p>
<br />

Superflows makes it easy to add an AI assistant to a software product. This lets users ask questions in natural language and the assistant makes calls to the software's API to answer them.

E.g. a CRM user could ask:
> Have we closed any deals with publishing companies? If so, who was involved in those deals?

or:
> Eve is ill today. Move her calls to the rest of the team - prioritise those who have had contact with the prospect before.

A user could ask their analytics assistant:
> Did the Google Ads campaign we ran last month have a positive ROI? How many conversions did it generate?

Superflows will make API calls to answer these questions or complete tasks, and write code to analyse data and produce visualisations.

**Check out a demo of Superflows in a CRM [here](https://superflows.ai/crm-demo).**

You can try out the cloud version for free [**here**](https://dashboard.superflows.ai) or self-host. You can learn more on the [docs pages](https://docs.superflows.ai/).

https://github.com/Superflows-AI/superflows/assets/33871096/3cc09611-a358-4a04-b6cf-2b46e12bf703

## Features

- [x] Calls API endpoints to complete tasks and answer questions for users
- [x] Writes code to analyse data and create plots 📊
- [x] Uses RAG (retrieval) to answer questions on static knowledge 📚
- [x] Developer dashboard to configure and test your AI assistant 🎛️
- [x] Stateful streaming API 🏞️
- [x] UI components (React components [here](https://github.com/Superflows-AI/chat-ui)) 🖥️
- [x] Upload API specifications for fast set up 💨
- [x] Asks for user confirmation before taking potentially damaging actions ✅ 
- [x] Track usage in dashboard 📊
- [x] Multi-LLM support (Finetuned GPT-3.5, GPT-4, Mixtral, Llama2...) 🌍
- [x] Collects user feedback on AI replies for fine-tuning 👍
- [x] Self-hosting, including with fully open source model. **[Reach out](mailto:henry@superflows.ai?subject=Self-hosting+OS+Model:+Superflows&body=Hi+Henry%2C%0A%0AI+work+at+COMPANY+as+ROLE.%0A%0AWe%27d+specifically+like+to+use+the+Open+Source+model+because+REASON.%0A%0AAll+the+best%2C%0AYOUR+NAME+%3A%29) if interested.** 🏠

## Setup
Setting up an AI Assistant in [Superflows Cloud](https://dashboard.superflows.ai) is simple: 

1. Upload your API specification
2. Test in the playground
3. Integrate into your product in 1 line of code

### Dashboard

Superflows has a developer dashboard where you can configure, evaluate and debug your AI assistant before putting it into production. 

You can interact with your assistant on the <b>'Playground'</b>. <b>'Developer mode'</b> shows you under the hood of what the assistant is thinking and planning. <b>'Mock API responses'</b> enables you to check the behaviour of the assistant without connecting it to an API. 

<img src="public/sf-crm-ai-corner.png" width="500px" alt="Superflows playground" />

The <b>'Actions'</b> page lets you control which API endpoints your assistant can call to answer user queries in a simple dashboard.

These endpoints can easily be uploaded via an Open API Specification, or entered manually. 

<img src="public/sf-actions-corner.png" width="500px" alt="Superflows actions page" />

### UI Components

Superflows comes with out-of-the-box React UI components. These components let you integrate Superflows into your product in 1 line of code ([integration guide](https://docs.superflows.ai/docs/integration-guide/react)). 

<img src="public/modal.png" width="500px" alt="Superflows modal" />

### API

The API specification can be found in the [docs](https://docs.superflows.ai/docs/category/api-specification). 


## Support / talk with founders
- [Schedule Demo 👋](https://meetings-eu1.hubspot.com/matthew-phillips/superflows-demo)
- [Slack Community 💭](https://join.slack.com/t/superflowsusers/shared_invite/zt-1zf93teqq-0I9H_niiGruVDPFVSzGj9w)
- Our numbers 📞 +44 (755) 7101-159 / +44 (780) 580-6766
- Our emails ✉️ [henry@superflows.ai](mailto:henry@superflows.ai?cc=matthew@superflows.ai&subject=Chat+about+Superflows) / [matthew@superflows.ai](mailto:matthew@superflows.ai?cc=henry@superflows.ai&subject=Chat+about+Superflows)

## Self-hosting

We haven't written a self-hosting guide for Superflows yet. If you're interested in self-hosting, please reach out to us on [Slack](https://join.slack.com/t/superflowsusers/shared_invite/zt-1zf93teqq-0I9H_niiGruVDPFVSzGj9w) or [email](mailto:henry@superflows.ai?cc=matthew@superflows.ai&subject=Interested+in+self-hosting).

## Roadmap

[Available here.](https://docs.superflows.ai/blog/roadmap)



## Setting up locally

- ### Local setup

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

- ### Docker Setup

Locate the `init.sh` file in the `docker/development` directory after cloning the project.

#### Prerequisites
 - Ensure that git is installed on your system. If it's not installed, the script will notify you.
 - Install docker and docker compose using the relevant installation guide for your operating system

#### Usage
If you are running on windows, preferably use the git bash cli or WSL, you might need sudo permissions 

Make the Script Executable
Before using the script for the first time, ensure it is executable then run it:


    chmod +x init.sh
	./init.sh


This script is designed to facilitate the process of setting up and managing the Superflows development environment with Supabase and also to setup the base environment configuration in your project. It ensures that the Supabase repository is either cloned or updated, and it also checks and manages the .env file, merging the existing .env.example files if necessary.

By default the script runs docker compose to run start the containers and build (where required)

#### Verify contents and set custom env
The script should have created the supabase folder and also a .env file.
- Review the env variables and correct or change to suit your environment - the env should already contain sensible defaults (however)
    - [optional] Set your OPENAI key  [`OPENAI_API_KEY`] ([reach out to self-host our fine-tuned LLM](mailto:henry@superflows.ai?subject=Self-hosting+OS+Model:+Superflows&body=Hi+Henry%2C%0A%0AI+work+at+COMPANY+as+ROLE.%0A%0AWe%27d+specifically+like+to+use+the+Open+Source+model+because+REASON.%0A%0AAll+the+best%2C%0AYOUR+NAME+%3A%29)) 
    - [optional] set in your SMTP credentials to enable email

- Run the compose file (depending on what version of compose you have installed)
```
docker compose up -d build 
```
or
```
docker-compose up -d build
```
