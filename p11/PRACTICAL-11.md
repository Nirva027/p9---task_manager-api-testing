# Practical 11: Containerization with Docker and Docker Compose

**Course:** Advanced Web Development Frameworks (ITUE301)
**Objective:** Containerize the Task Management frontend and backend, and run them with MongoDB using Docker Compose.

## What this practical runs

The Compose file builds this repository's full-stack app and starts three services:

```text
Browser :5173 -> frontend (Nginx serving the React build)
                    |
                    +-- /api/* -> backend:5000
                                      |
                                      +--> mongodb:27017/taskdb
```

The Compose setup, Dockerfiles, and Nginx configuration are in this `p11` folder. The `.dockerignore` file is at the repository root because that directory is the Docker build context.

## Requirements

- Docker Desktop or Docker Engine with Docker Compose v2
- Internet access for the initial image and npm dependency downloads

Check Docker and Compose:

```powershell
docker --version
docker compose version
docker info
```

If `docker info` cannot connect to the Docker engine, start Docker Desktop and wait for its engine to finish starting before continuing.

## Run the application

Open PowerShell and start the entire stack with one command:

```powershell
cd D:\portfolio\p9-task-manager-api-testing\p11
docker compose up --build
```

Compose builds the frontend and backend images, waits for MongoDB and the backend health checks, and starts the services on the `app-network` bridge network. Keep this terminal open to view logs. The first run may take several minutes while images and npm dependencies are downloaded.

When startup is complete:

- Open the React application at [http://localhost:5173](http://localhost:5173).
- The backend health endpoint is [http://localhost:5000/api/health](http://localhost:5000/api/health).
- Register or sign in in the app, then create and manage tasks.
- Nginx sends browser requests for `/api/...` to the backend service.

## Verify the containers and API

In a second PowerShell window:

```powershell
cd D:\portfolio\p9-task-manager-api-testing\p11
docker compose ps
docker compose logs backend mongodb
Invoke-RestMethod http://localhost:5000/api/health
```

The health endpoint should return a JSON status of `ok`. The frontend and backend should show as running, and MongoDB should become healthy.

Stop the containers with `Ctrl+C` in the Compose terminal, then:

```powershell
docker compose down
```

The named `mongodb-data` volume is retained, so MongoDB data persists when containers stop or are recreated. To intentionally remove that data as well, run `docker compose down --volumes`.

## Files and configuration

- `Dockerfile.frontend`: multi-stage build; Node 22 builds React, and Nginx serves the production output.
- `Dockerfile.backend`: installs production dependencies and runs the Express/Mongoose API on port 5000.
- `docker-compose.yml`: defines frontend, backend, and MongoDB, their port mappings, health checks, network, and persistent database volume.
- `nginx.conf`: serves the React single-page app and proxies `/api/` requests to `backend:5000`.
- The repository-root `.dockerignore`: excludes `.env`, `node_modules`, Git metadata, and generated build output from the image build context.

Compose sets `MONGO_URI` to `mongodb://mongodb:27017/taskdb`. Inside the Compose network, `mongodb` is the MongoDB service's DNS name. `localhost` inside the backend container would refer to the backend container itself, not the database container.

Compose supplies a development-only default `JWT_SECRET` so the stack can start without manual setup. Set a private `JWT_SECRET` in the shell or a local Compose `.env` file for your own use. Never use the example default in production. `OPENAI_API_KEY` is optional; task management works without it, but AI description suggestions require a valid key.

## Key questions

1. **Why use the MongoDB service name instead of `localhost`?** Each container has its own network namespace. Compose provides service-name DNS so the backend can reach the database at `mongodb:27017`.
2. **How do `EXPOSE` and Compose `ports` differ?** `EXPOSE` documents the port the image listens on; it does not publish that port to the host. A mapping such as `5173:80` publishes container port 80 on host port 5173.
3. **Why not copy host `node_modules` into an image?** Host modules may target a different OS or CPU, include development-only packages, and make the context/image unnecessarily large. The Dockerfiles install from the lockfile inside Linux containers instead.
4. **Why a multi-stage frontend build?** Node and build tooling are needed only to produce static files. The final image contains Nginx and the built app, not the compiler and complete dependency tree.

## Troubleshooting

- **Docker engine connection error:** Start Docker Desktop and wait for the engine; confirm with `docker info`.
- **Port already in use:** Stop the process using 5173, 5000, or 27017, or change the host side of that service's Compose port mapping.
- **Backend cannot connect to MongoDB:** Confirm `MONGO_URI` uses `mongodb://mongodb:27017/taskdb` and inspect `docker compose logs mongodb backend`.
- **Changes do not appear:** Rebuild with `docker compose up --build`.
- **Need to reset database contents:** `docker compose down --volumes` removes the named database volume as well as containers.

## Submission evidence

Capture the running frontend, `docker compose ps` showing the services, and the backend/MongoDB logs or health endpoint response.
