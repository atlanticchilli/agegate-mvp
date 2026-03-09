
# Set your project ID (must be globally unique)
PROJECT_ID="agegate-mvp"
REGION="us-central1"

# Create GCP project
gcloud projects create $PROJECT_ID --name="AgeGate MVP"
gcloud config set project $PROJECT_ID

# Link billing (required for Cloud Run etc.)
# Find your billing account ID first:
gcloud billing accounts list
# Then link it (replace YOUR_BILLING_ID):
gcloud billing projects link $PROJECT_ID --billing-account=YOUR_BILLING_ID

# Enable all the APIs you need
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  storage.googleapis.com

# Add Firebase to the GCP project
firebase projects:addfirebase $PROJECT_ID
firebase use $PROJECT_ID

# Create Firestore database
gcloud firestore databases create \
  --location=$REGION \
  --type=firestore-native

# Create Artifact Registry repo for Docker images
gcloud artifacts repositories create agegate-images \
  --repository-format=docker \
  --location=$REGION

# Create Cloud Storage bucket for widget CDN (public)
gcloud storage buckets create gs://${PROJECT_ID}-widget-cdn \
  --location=$REGION \
  --uniform-bucket-level-access

gcloud storage buckets add-iam-policy-binding gs://${PROJECT_ID}-widget-cdn \
  --member=allUsers \
  --role=roles/storage.objectViewer

# Create service account for Cloud Run
gcloud iam service-accounts create agegate-api \
  --display-name="AgeGate API"

SA_EMAIL="agegate-api@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Create JWT signing secret
openssl rand -hex 32 | gcloud secrets create jwt-signing-key \
  --data-file=- \
  --replication-policy=automatic

# Initialise monorepo
mkdir agegate && cd agegate

cat > package.json << 'EOF'
{
  "name": "agegate",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:api": "npm run dev --workspace=packages/api",
    "dev:dashboard": "npm run dev --workspace=packages/dashboard",
    "dev:widget": "npm run dev --workspace=packages/widget",
    "emulators": "firebase emulators:start"
  }
}
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
.next/
*.mmdb
.env
.env.local
.firebase/
*-debug.log
serviceAccountKey.json
EOF

mkdir -p packages/{shared/src,api/src/{routes,services,providers,middleware,config},api/data,widget/src,dashboard/src}
mkdir -p infrastructure data

# Initialise Firebase (interactive — select Firestore + Emulators)
firebase init firestore emulators

git init