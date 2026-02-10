# Database Updates After Redeployment

After redeploying Overseer or pulling new database schema changes, you need to apply pending migrations to sync the database with your updated schema.

## Running Migrations

### Development

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Or, interactively develop migrations
npx prisma migrate dev --name <migration_name>
```

### Production

```bash
# Always use migrate deploy in production (non-interactive)
npx prisma migrate deploy
```

## What to Do After Pulling New Changes

If you've pulled new code that includes database schema changes:

1. **Ensure your database URL is configured:**
   ```bash
   # Check that DATABASE_URL is set in your .env file
   cat .env | grep DATABASE_URL
   ```

2. **Apply the migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Verify the schema was updated:**
   ```bash
   # View your current Prisma schema
   npx prisma db push --skip-generate
   ```

## Troubleshooting

### Migration Already Applied
If you see an error that a migration was already applied, the database is already up-to-date. No action needed.

### Failed Migration
If a migration fails:

1. Check the error message for database-specific issues
2. Verify your `DATABASE_URL` is correct and the database is accessible
3. Check if there's a pending migration file that wasn't properly applied
4. Contact the development team if the issue persists

### View Migration History
```bash
# See all applied migrations
npx prisma migrate status
```

## Deployment Checklist

- [ ] New code has been pulled/deployed
- [ ] `.env` file has correct `DATABASE_URL`
- [ ] Run `npx prisma migrate deploy`
- [ ] Verify migrations applied successfully
- [ ] Start/restart the application
- [ ] Test the application to ensure it works correctly
