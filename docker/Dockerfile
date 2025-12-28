# PocketBase Docker Image
FROM alpine:latest

# PocketBase version
ARG PB_VERSION=0.23.4

# Install dependencies
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    tzdata

# Download and install PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

# Create data directory
RUN mkdir -p /pb/pb_data

# Expose port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

# Run PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
