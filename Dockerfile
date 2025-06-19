# ---- Base Node ----
# Use a specific Node.js version known to work, Alpine for smaller size
FROM node:23-alpine AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# ---- Dependencies ----
# Install dependencies first to leverage Docker cache
FROM base AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
# Use npm ci for deterministic installs based on lock file
# Install only production dependencies in this stage for the final image
RUN npm ci --only=production

# ---- Builder ----
# Build the application
FROM base AS builder
WORKDIR /usr/src/app
# Copy dependency manifests and install *all* dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm ci
# Copy the rest of the source code
COPY . .
# Build the TypeScript project
RUN npm run build

# ---- TeX Live Installer ----
# This stage installs a minimal TeX Live distribution and required packages
FROM alpine:latest AS texlive
RUN apk add --no-cache perl wget
# Install TeX Live using the official installer
RUN wget http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz && \
    tar -xzf install-tl-unx.tar.gz && \
    cd install-tl-* && \
    # Use a custom profile to install a minimal scheme and required packages
    echo "selected_scheme scheme-minimal" > texlive.profile && \
    echo "tlpdbopt_install_docfiles 0" >> texlive.profile && \
    echo "tlpdbopt_install_srcfiles 0" >> texlive.profile && \
    ./install-tl --profile=texlive.profile && \
    # Add TeX Live to the path
    export PATH="/usr/local/texlive/2025/bin/x86_64-linuxmusl:$PATH" && \
    # Install required packages
    tlmgr install luatex textgreek lm && \
    # Clean up
    cd / && \
    rm -rf install-tl-* install-tl-unx.tar.gz

# ---- Runner ----
# Final stage with only production dependencies and built code
FROM base AS runner
WORKDIR /usr/src/app
# Copy TeX Live from the texlive stage
COPY --from=texlive /usr/local/texlive/2025 /usr/local/texlive/2025
# Copy production node_modules from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy built application from the 'builder' stage
COPY --from=builder /usr/src/app/dist ./dist
# Copy package.json (needed for potential runtime info, like version)
COPY package.json .

# Add TeX Live to the path for all users
ENV PATH=/usr/local/texlive/2025/bin/x86_64-linuxmusl:$PATH

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port if the application runs a server (adjust if needed)
ENV MCP_TRANSPORT_TYPE=http
EXPOSE 3010

# Command to run the application
# This will execute the binary defined in package.json
CMD ["npx", "mcp-ts-template"]
