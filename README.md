# Face Mask Classifier Demo

This is a frontend-only React web app that uses [TensorFlow.js](https://www.tensorflow.org/js) to:
- Detect faces via webcam
- Classify if the detected face is wearing a mask or not

Built for demo purposes — deployed as a static website on AWS S3 + CloudFront.

---

## 🚀 Deployment (CI/CD)

Deployment is fully automated via GitHub Actions:
- On every push to the `main` branch:
  - Build the React app (`npm run build`)
  - Upload build output to the S3 bucket: `face-mask-classifier-retanatech-demo`
  - Invalidate the CloudFront distribution cache (`E12QON4WKATNXJ`) so the new build goes live immediately
- Uses AWS IAM + OpenID Connect (OIDC) for secure, keyless deploy:
  - IAM role `github-actions-deploy` is assumed only by this repo on the `main` branch

All IaC is defined in Terraform under `face-mask-demo-iac/`.

---

## 🛠 Project structure

```
face-mask-classifier-demo/
├── face-mask-demo/ # React app
├── face-mask-demo-iac/ # Terraform IaC: S3 bucket, CloudFront, IAM role, OIDC provider
└── .github/workflows/ # GitHub Actions workflow for CI/CD
```

---

## 📦 Requirements if you fork or copy this repo

This repo **ignores** sensitive files and local state, so if you want to deploy your own copy:

✅ You need to:
- Create your **own S3 bucket** for hosting  
- Create a **CloudFront distribution** (can be automated via Terraform)
- Create an **IAM role** with correct trust policy for GitHub Actions OIDC  
- Add a GitHub Actions workflow (`.github/workflows/deploy.yml`) referencing:
  - Your AWS account ID
  - Your bucket name
  - Your CloudFront distribution ID
  - Your repo name & branch in the trust policy

---

## ⚙ Terraform state & config

Local Terraform state (`*.tfstate`), `.terraform/` plugin directory, and secrets (`*.tfvars`) are **.gitignored**.
This avoids committing sensitive data or unique environment info.

---

## 📚 Quick start

```bash
cd face-mask-demo
npm install
npm run start
```
To deploy:

Update and apply Terraform in face-mask-demo-iac/

Push to main → CI/CD auto-deploys

✏ Notes
Built using TensorFlow.js + React

Static frontend only: no backend required

Live on CloudFront for fast global delivery