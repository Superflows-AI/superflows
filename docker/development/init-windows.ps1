# SET POSTGRES DETAILS
$POSTGRES_USER="postgres"
$POSTGRES_PASSWORD="your-super-secret-and-long-postgres-password"
$POSTGRES_DB="postgres"
$POSTGRES_PORT="5432"
$POSTGRES_HOST="db"
$CONTAINERNAME="supabase-db"

function Manage-SupabaseRepo {
    if (Test-Path "supabase/.git") {
        Write-Host "Supabase repository already exists. Pulling the latest changes..."
        cd supabase
        git pull
        cd ..
    } else {
        Write-Host "Cloning the Supabase repository..."
        git clone -n --depth=1 --filter=tree:0 https://github.com/supabase/supabase
        cd supabase
        git sparse-checkout set --no-cone docker
        git checkout
        cd ..
    }
}

function Manage-EnvFile {
    $envFile=".env"
    if (!(Test-Path $envFile)) {
        if ((Test-Path "../../.env.example") -and (Test-Path "supabase/docker/.env.example")) {
            Write-Host "Creating .env file from .env.example files..."
            Get-Content "supabase/docker/.env.example", "../../.env.example" | Out-File $envFile
            # Update with your logic for modifying the .env file as needed
            # ...
        } else {
            Write-Host "Both .env.example files were not found."
            Exit
        }
    } else {
        Write-Host ".env file already exists."
    }
}

# Check if git is installed
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git is not installed. Please install it and try again."
    Exit
}

# Clone the repositories
Manage-SupabaseRepo

# Copy the .env.example files
Manage-EnvFile

# Build the containers
Write-Host "Attempting to run the containers...you can press Ctrl+C to stop the process, or wait for container to build."
docker-compose up -d --build

# Include your logic for running migrations or other necessary steps after building the containers
# ...
