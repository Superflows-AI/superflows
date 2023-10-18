#!/bin/bash

# SET POSTGRES DETAILS
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_HOST=db
CONTAINERNAME=supabase-db
SUPERFLOWS_PORT=8080
API_SUPABASE_URL=http://kong:8000
manage_supabase_repo() {
    if [ -d "supabase" ]; then
        if [ -d "supabase/.git" ]; then
            echo "Supabase repository already exists. Pulling the latest changes..."
            cd supabase && git pull && cd ..
        else
            echo "Directory named supabase exists but is not a git repository. Removing it..."
            rm -rf supabase
            echo "Cloning the Supabase repository..."
            git clone -n --depth=1 --filter=tree:0 https://github.com/supabase/supabase && cd supabase && git sparse-checkout set --no-cone docker && git checkout && cd ..
        fi
    else
        echo "Cloning the Supabase repository..."
        rm -rf supabase
        git clone -n --depth=1 --filter=tree:0 https://github.com/supabase/supabase && cd supabase && git sparse-checkout set --no-cone docker && git checkout && cd ..
    fi
}


# Function to manage the .env file
manage_env_file() {
    env_file=".env"
    if [ ! -f "$env_file" ]; then
        if [ -f "../../.env.example" ] && [ -f "supabase/docker/.env.example" ]; then
            echo "Creating .env file from .env.example files..."
            cat "supabase/docker/.env.example" "../../.env.example" > $env_file
            if [ -f "$env_file" ]; then 
                POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$env_file" | cut -d '=' -f2)
                POSTGRES_DB=$(grep "^POSTGRES_DB=" "$env_file" | cut -d '=' -f2)
                POSTGRES_PORT=$(grep "^POSTGRES_PORT=" "$env_file" | cut -d '=' -f2)
                SUPERFLOWS_PORT=$(grep "^SUPERFLOWS_PORT=" "$env_file" | cut -d '=' -f2)
                sed_command="sed -i"

                if [ "$(uname)" == "Darwin" ]; then
                    # macOS
                    sed_command="sed -i ''"
                fi
                if grep -q "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$env_file"; then
                    $sed_command "s/^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/NEXT_PUBLIC_SUPABASE_ANON_KEY=\${ANON_KEY}/" "$env_file"
                else
                    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=\${ANON_KEY}" >> "$env_file"
                fi
                if grep -q "^SERVICE_LEVEL_KEY_SUPABASE=" "$env_file"; then
                    $sed_command "s/^SERVICE_LEVEL_KEY_SUPABASE=.*/SERVICE_LEVEL_KEY_SUPABASE=\${SERVICE_ROLE_KEY}/" "$env_file"
                else
                    echo "SERVICE_LEVEL_KEY_SUPABASE=\${SERVICE_ROLE_KEY}" >> "$env_file"
                fi
                if grep -q "^ENABLE_EMAIL_AUTOCONFIRM=" "$env_file"; then
                    $sed_command "s/^ENABLE_EMAIL_AUTOCONFIRM=.*/ENABLE_EMAIL_AUTOCONFIRM=true/" "$env_file"
                fi
                if grep -q "^API_SUPABASE_URL=" "$env_file"; then
                    $sed_command "s/^API_SUPABASE_URL=.*/API_SUPABASE_URL=$API_SUPABASE_URL/" "$env_file"
                else
                    echo "API_SUPABASE_URL=$API_SUPABASE_URL" >> "$env_file"
                fi
            fi
        else
            echo "Both .env.example files were not found."
            exit 1
        fi
    else
        echo ".env file already exists."
    fi
}

run_migrations() {
    limit=5
    while ! docker ps | grep $CONTAINERNAME; do
        echo "Waiting for container to start..."
        limit=$((limit - 1))
        if [ $limit -eq 0 ]; then
            echo "Container failed to start"
            exit 1
        fi
        sleep 2
    done
    echo "Container started"
    echo 'y' | npx supabase db push --db-url="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
    echo "Your service should be running on http://localhost:$SUPERFLOWS_PORT"
}

# Check if git is installed
if ! command -v git &> /dev/null
then
    echo "Git is not installed. Please install it and try again."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install it and try again."
    exit 1
fi

# Check if Docker Compose is installed and decide the compose command to use
if command -v docker-compose &> /dev/null
then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null
then
    COMPOSE_CMD="docker compose"
else
    echo "Neither docker-compose nor docker compose is available. Please install one of them and try again."
    exit 1
fi

# Clone the repositories
manage_supabase_repo
# Copy the .env.example files
manage_env_file
# Build the containers
echo "Attempting to run the containers...you can press Ctrl+C to stop the process. or wait for container to build."
$COMPOSE_CMD up -d --build
# Run the migrations
# echo "Attempting to run migrations"
# run_migrations
