FROM kong:3.8-ubuntu

# =============================================================================
# GuayCampo - Kong with custom Lua plugins
# =============================================================================

USER root

# Install Lua dependencies required by custom plugins
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        lua5.1 \
        luarocks \
    && rm -rf /var/lib/apt/lists/*

# Install lua-cjson (usually bundled with Kong/OpenResty, but explicit is safer)
RUN luarocks install lua-cjson 2>/dev/null || true

# Copy custom plugins into Kong's Lua path
COPY plugins/ /usr/local/share/lua/5.1/kong/plugins/

# Tell Kong about the custom plugins via environment variable.
# In docker-compose / k8s, also set:
#   KONG_PLUGINS=bundled,tenant-injector,jwt-validator
ENV KONG_PLUGINS="bundled,tenant-injector,jwt-validator"

USER kong
