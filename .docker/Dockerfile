FROM node:lts-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npx ncc build src/index.js -o dist --license licenses.txt

# --- Runtime image ---
FROM node:lts-alpine
LABEL org.opencontainers.image.source="https://github.com/qualibooth/QualiBooth-Action" \
      org.opencontainers.image.description="QualiBooth Accessibility Code Analysis — portable Docker image"

RUN apk add --no-cache bash git

WORKDIR /app

# Copy bundled dist from build stage
COPY --from=build /app/dist ./dist

# Entry point (must be executable)
COPY .docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
