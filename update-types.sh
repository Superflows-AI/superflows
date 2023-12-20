sed_command="sed -i "

if [ "$(uname)" = "Darwin" ]; then
    # macOS
    sed_command="sed -i ''"
fi

npx supabase gen types typescript --local > lib/database.types.ts
$sed_command 's/query_embedding: string/query_embedding: number[]/' lib/database.types.ts
$sed_command 's/embedding: string | null/embedding: number[]/' lib/database.types.ts
$sed_command 's/embedding?: string | null/embedding?: number[]/' lib/database.types.ts
npx prettier --write lib/database.types.ts
