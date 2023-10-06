#!/bin/bash
manage_supabase_repo() {
    if [ -d "supabase/.git" ]; then
        echo "Supabase repository already exists. Pulling the latest changes..."
        cd supabase && git pull && cd ..
    else
        echo "Cloning the Supabase repository..."
        git clone -n --depth=1 --filter=tree:0 https://github.com/supabase/supabase && cd supabase && git sparse-checkout set --no-cone docker && git checkout && cd ..
    fi
}

# Function to manage the .env file
manage_env_file() {
    if [ ! -f ".env" ]; then
        if [ -f "../../.env.example" ] && [ -f "supabase/docker/.env.example" ]; then
            echo "Creating .env file from .env.example files..."
            cat "../../.env.example" "supabase/docker/.env.example" > .env
        else
            echo "Both .env.example files were not found."
            exit 1
        fi
    else
        echo ".env file already exists."
    fi
}

# Check if git is installed
if ! command -v git &> /dev/null
then
    echo "Git is not installed. Please install it and try again."
    exit 1
fi
# Clone the repositories
manage_supabase_repo
# Copy the .env.example files
manage_env_file