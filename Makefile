.PHONY: all build clean

p:
	npx prettier --write . --check '!./docker/development/supabase/docker/volumes'

pc: p
	npm run lint

run:
	npm run dev

types:
	./update-types.sh

build:
	npm run build

test:
	npm test
