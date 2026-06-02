#!/usr/bin/env bash
set -euo pipefail

echo 'Starting development deployment...'

if [ ! -f .env.development ]; then
  echo "Error: .env.development file not found!"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running!"
  exit 1
fi

mkdir -p .neon_local

if ! grep -q '.neon_local/' .gitignore 2>/dev/null; then
  echo ".neon_local/" >> .gitignore
  echo "Added .neon_local/ to .gitignore"
fi

echo "Starting neon-local proxy..."
docker compose -f docker-compose.dev.yml up -d --build neon-local

echo 'Waiting for database to be ready...'
status=""
# Wait 90s for start_period (60s) + healthcheck retries to complete
for i in {1..45}; do
  status=$(docker inspect -f '{{.State.Health.Status}}' chat-backend-neon-local 2>/dev/null || echo "waiting")
  if [ "$status" = "healthy" ]; then
    echo "neon-local is healthy!"
    break
  fi
  echo "  [$i/45] Status: $status..."
  sleep 2
done

if [ "$status" != "healthy" ]; then
  echo "Error: neon-local did not become healthy. Logs:"
  docker compose -f docker-compose.dev.yml logs neon-local
  exit 1
fi

echo "Running database migrations..."
docker compose -f docker-compose.dev.yml run --rm app \
  npx prisma migrate deploy

echo "Starting application..."
# docker compose -f docker-compose.dev.yml build --no-cache app
# docker compose -f docker-compose.dev.yml up

docker compose -f docker-compose.dev.yml up --build app

echo ""
echo "Development deployment complete!"
echo "  App:      http://localhost:3000"
echo "  Database: postgresql://neon:npg@localhost:5432/neondb?sslmode=disable"

# #!/usr/bin/env bash
# set -euo pipefail

# echo 'starting development deployment...'

# if [ ! -f .env.development ]; then
#   echo "Error: .env.development file not found!"
#   exit 1
# fi

# if ! docker info >/dev/null 2>&1; then
#   echo "Error: Docker is not running!"
#   exit 1
# fi


# mkdir -p .neon_local

# if ! grep -q '.neon_local/' .gitignore; then
#   echo ".neon_local/" >> .gitignore
#   echo "Added .neon_local/ to .gitignore"
# fi


# echo "Starting Docker Compose for development..."
# echo 'neon local proxy will create ephemeral database brach'
# echo 'Application will run and hot reload on code changes'

# echo "Starting Docker Compose for development..."
# docker compose -f docker-compose.dev.yml up -d --build neon-local

# echo 'Waiting database to be ready...'
# status=""
# for i in {1..30}; do
#   status=$(docker inspect -f '{{.State.Health.Status}}' chat-backend-neon-local 2>/dev/null || true)
#   if [ "$status" = "healthy" ]; then
#     echo "neon-local is healthy!"
#     break
#   fi
#   echo "Waiting for neon-local to become healthy... (attempt $i/30, current status: $status)"
#   sleep 2
# done

# if [ "$status" != "healthy" ]; then
#   echo "Error: neon-local did not become healthy."
#   docker compose -f docker-compose.dev.yml logs neon-local
#   exit 1
# fi

# docker compose -f docker-compose.dev.yml exec -T neon-local \
#   sh -c "PGPASSWORD=npg psql -h 127.0.0.1 -U neon -d neondb -c "

# # echo 'applying database migrations...'
# # npx prisma migrate dev --schema=./prisma/schema.prisma --name at_deployment

# echo "Starting the application with Docker Compose..."
# docker compose -f docker-compose.dev.yml up -d --build app

# echo "Development deployment completed. Your application is running and ready for development!"
# echo "You can access the application at http://localhost:3000"
# echo 'Database : postgresql://neon:npg@localhost:5432/neondb?sslmode=require&channel_binding=require'