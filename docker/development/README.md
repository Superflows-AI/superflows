### Developer Docker Guide

This script is designed to facilitate the process of setting up and managing the Superflows development environment with Supabase and also to setup the base environment configuration in your project. It ensures that the Supabase repository is either cloned or updated, and it also checks and manages the .env file, merging the existing .env.example files if necessary.

### Prerequisites
Ensure that git is installed on your system. If it's not installed, the script will notify you.
Also install docker and docker compose using the relevant installation guide for your operating system

#### Usage
Make the Script Executable
Before using the script for the first time, ensure it is executable then run it:


    chmod +x init.sh
	./init.sh

#### Verify contents
This should create the supabase folder and also a .env file.
- Review the env variables and correct or change to suit your environment - the env should already contain sensible defaults (however)
    - Set in your OPENAI key  [OPENAI_API_KEY] 
    - [optional] set in your SMTP credentials to enable email

- Run the compose file (depending on what version of compose you have installed)
    docker compose up -d build 
    or docker-compose up -d build 
