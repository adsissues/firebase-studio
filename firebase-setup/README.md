# Firebase Setup Instructions

This document provides instructions for setting up the necessary Firebase configurations for the StockWatch application.

## Firestore Security Rules

The application requires specific security rules to function correctly, enabling proper access control for different user roles (admin, user) and functionalities. An error like `FirebaseError: Missing or insufficient permissions` indicates that these rules are not correctly configured.

### How to Update Firestore Rules:

1.  **Copy the Rules**: Open the `firestore.rules` file located in the root of this project and copy its entire content.

2.  **Go to Firebase Console**: Navigate to your Firebase project console.

3.  **Go to Firestore Database**: From the left-hand menu, select **Firestore Database**.

4.  **Open the Rules Tab**: At the top of the Firestore Database page, click on the **Rules** tab.

5.  **Paste and Publish**:
    *   Delete the existing content in the rules editor.
    *   Paste the rules you copied from the `firestore.rules` file.
    *   Click the **Publish** button.

After publishing, the permission errors in your application should be resolved. The new rules take effect almost immediately.
