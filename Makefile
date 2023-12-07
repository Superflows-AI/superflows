.PHONY: all build clean

p:
	npx prettier --write . --check '!./docker/development/supabase/docker/volumes'

pc: p
	npm run lint

run:
	npm run dev

build:
	npm run build

test:
# Run in series to stop race condition
	npm test