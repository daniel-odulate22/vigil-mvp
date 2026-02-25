# Vigil: Offline-First Medication Safety System

## The Problem

Systemic medication non-adherence is a silent killer. In infrastructure-heavy environments, health tools often fail because they depend on constant connectivity. When a patient in a low-bandwidth area cannot access their schedule, the system breaks. This is not a failure of the patient. It is a failure of the architecture. Most current solutions are passive lists that require manual, error-prone data entry. This creates friction that leads to abandonment.

## The Solution: Vigil

Vigil is a high-value health system intervention designed to bridge the gap between clinical prescription and patient action. It is built as a Progressive Web App (PWA) with a strict offline-first philosophy. Vigil uses deterministic computer vision to scan medication packaging, identify the drug, and automate the scheduling process. By removing the need for manual input and internet reliance, Vigil turns a smartphone into a reliable clinical safety tool.

## System Logic

When engineering Vigil, the focus remained on logic over memorization. The system operates through four distinct phases:

1. **Identification**: The AI module identifies the medication through visual scanning, eliminating human entry error.
2. **Understanding**: The system parses the dosage requirements and understands the specific intervals required for the patient's recovery.
3. **Path Selection**: Vigil evaluates the local environment. If no internet is detected, it selects a local-storage path for data and utilizes SMS-based triggers for caregiver alerts.
4. **Application**: The solution is applied through a persistent notification layer that remains active regardless of the app's state.

## Core Values

- **Offline-First Reliability**: The system is functional in zero-connectivity environments. All AI processing for medication scanning happens client-side to ensure privacy and uptime.
- **Deterministic AI**: We use computer vision to ensure that the medication being taken matches the prescribed regimen exactly.
- **Escalation Loops**: Adherence is a team effort. If a dose is missed, the system triggers an automated SMS loop to designated caregivers.

## Technical Architecture

Vigil is built to be lightweight and resilient. The frontend utilizes a minimalist, industrial dark interface to reduce cognitive load on the patient.

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | React / Next.js (PWA) |
| **Logic** | Service Workers for offline persistence |
| **Vision** | TensorFlow.js for local image classification |
| **Database** | IndexedDB for local-first data storage |
| **Alerts** | Web Push API and Twilio SMS Gateway |

## Local Installation

To get the system running locally for development:

1. Clone the repository to your local machine.
2. Run the command to install dependencies using your preferred package manager.
3. Configure the environment variables for the SMS gateway.
4. Start the development server and toggle the browser to "Offline" mode to test the persistence logic.

## The Goal

Vigil does not exist to be a "smart" reminder. It exists to be a bulletproof layer of the healthcare stack. By leveraging AI at the edge, we are ensuring that every patient has access to a high-value safety system that does not quit when the signal does.





# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
