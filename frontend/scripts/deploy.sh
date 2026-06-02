#!/usr/bin/env bash
set -euo pipefail

# ─── SwapSmart Frontend Deploy Script ─────────────────────────────────────────
# Builds the Next.js production app and deploys to S3 + CloudFront.
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID environment variables set
#
# Usage:
#   chmod +x scripts/deploy.sh
#   S3_BUCKET=swapsmart-assets-dev-123456789 \
#   CLOUDFRONT_DISTRIBUTION_ID=E1234567890 \
#   ./scripts/deploy.sh
# ──────────────────────────────────────────────────────────────────────────────

# Validate required environment variables
: "${S3_BUCKET:?Error: S3_BUCKET environment variable is required}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Error: CLOUDFRONT_DISTRIBUTION_ID environment variable is required}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           SwapSmart Frontend Deployment                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Build ────────────────────────────────────────────────────────────
echo "▶ Step 1/4: Running Next.js production build..."
npm run build

if [ $? -ne 0 ]; then
  echo "✗ Build failed. Aborting deployment."
  exit 1
fi
echo "✓ Build completed successfully."
echo ""

# ─── Step 2: Sync to S3 ──────────────────────────────────────────────────────
echo "▶ Step 2/4: Syncing .next/standalone to S3..."

# Next.js standalone output includes the server; for static hosting we sync
# the static assets and the standalone directory
if [ -d ".next/standalone" ]; then
  aws s3 sync .next/standalone "s3://${S3_BUCKET}/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.map"

  # Sync static assets separately with appropriate cache headers
  aws s3 sync .next/static "s3://${S3_BUCKET}/_next/static" \
    --cache-control "public, max-age=31536000, immutable"

  # Sync public directory
  if [ -d "public" ]; then
    aws s3 sync public "s3://${S3_BUCKET}/" \
      --cache-control "public, max-age=86400"
  fi
else
  echo "⚠ .next/standalone not found. Syncing .next/static and public instead..."
  aws s3 sync .next/static "s3://${S3_BUCKET}/_next/static" \
    --cache-control "public, max-age=31536000, immutable"

  if [ -d "public" ]; then
    aws s3 sync public "s3://${S3_BUCKET}/" \
      --cache-control "public, max-age=86400"
  fi
fi

echo "✓ S3 sync completed."
echo ""

# ─── Step 3: CloudFront Invalidation ─────────────────────────────────────────
echo "▶ Step 3/4: Creating CloudFront invalidation..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✓ Invalidation created: ${INVALIDATION_ID}"
echo ""

# ─── Step 4: Print CloudFront URL ────────────────────────────────────────────
echo "▶ Step 4/4: Retrieving CloudFront domain..."

CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --query 'Distribution.DomainName' \
  --output text)

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  ✓ Deployment complete!"
echo ""
echo "  CloudFront URL: https://${CLOUDFRONT_DOMAIN}"
echo "  Invalidation:   ${INVALIDATION_ID} (propagating...)"
echo "══════════════════════════════════════════════════════════════"
