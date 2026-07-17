#!/usr/bin/env bash

set -euo pipefail

usage() {
    cat <<'EOF'
Usage:
  scripts/app-env.sh dev|prod [env|serve|build|android]

Commands:
  env      Generate src/assets/env.json for the selected environment.
  serve    Generate env and run ionic serve --external --ssl.
  build    Generate env and build the web assets.
  android  Generate env and build an Android Cordova APK.

Defaults:
  dev defaults to serve.
  prod defaults to build.
EOF
}

environment="${1:-}"
command="${2:-}"

case "$environment" in
    dev)
        node_env="development"
        command="${command:-serve}"
        ;;
    prod)
        node_env="production"
        command="${command:-build}"
        ;;
    -h|--help|help|"")
        usage
        exit 0
        ;;
    *)
        usage >&2
        exit 1
        ;;
esac

run_env() {
    NODE_ENV="$node_env" npx gulp env
}

run_env

case "$command" in
    env)
        ;;
    serve)
        NODE_ENV="$node_env" npx ionic serve --external --ssl
        ;;
    build)
        if [[ "$node_env" == "production" ]]; then
            NODE_OPTIONS=--max-old-space-size=8192 NODE_ENV=production npx ionic build --prod
        else
            NODE_OPTIONS=--max-old-space-size=8192 NODE_ENV=development npx ionic build --configuration=development
        fi
        ;;
    android)
        if [[ "$node_env" == "production" ]]; then
            npm run prod --prefix cordova-plugin-moodleapp
            NODE_ENV=production npx ionic cordova build android --prod
        else
            npx ionic cordova build android --configuration=development
        fi
        ;;
    -h|--help|help)
        usage
        ;;
    *)
        usage >&2
        exit 1
        ;;
esac
