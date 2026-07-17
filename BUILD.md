  What changed for dev/prod split:

  - Restored moodle.config.json to production:
      - https://app.evidyapith.com
  - Added moodle.config.dev.json:
      - https://pg.dynaperf.com
  - Updated .gitignore so moodle.config.dev.json is tracked.
  - Added scripts/app-env.sh.
  - Added npm scripts in package.json.

  Use these now:

  npm run serve:dev

  This generates dev env with pg.dynaperf.com and runs:

  ionic serve --external --ssl

  For production env switch only:

  npm run switch:prod

  For dev env switch only:

  npm run switch:dev

  For production web build:

  npm run build:prod:app

  For production Android APK build:

  npm run build:android:prod

  I verified:

  - ./scripts/app-env.sh dev env generates pg.dynaperf.com.
  - ./scripts/app-env.sh prod env generates app.evidyapith.com.

  I left src/assets/env.json in prod state, so the current
  generated env is safe for prod/APK unless you switch back to dev.
