# Privacy Policy for Mels

**Effective Date:** August 25, 2026  
**Last Updated:** August 25, 2026  
**Publisher:** Melkam Studios (Mickyas Tesfaye)  
**Contact:** [alazartesfaye42@gmail.com](mailto:alazartesfaye42@gmail.com)

---

## 1. Overview and Core Philosophy

**Mels** is a fast, lightweight, local-first desktop API client developed by Melkam Studios. We believe that developer tools should respect your privacy, your security, and your data ownership. 

Our fundamental principle is simple: **Your data belongs to you.** Mels operates entirely offline-first and on your local machine. We do not collect, transmit, sell, or analyze your personal information or API traffic.

---

## 2. Information We Do NOT Collect

Unlike cloud-dependent API clients, Mels is built without any telemetry or surveillance infrastructure. Specifically:

- **No Personal Information:** We do not require you to create an account, sign in, or provide personal details (such as names, phone numbers, or passwords) to use the app.
- **No Analytics or Telemetry:** Mels does not include tracking SDKs, analytics services (e.g., Google Analytics, Mixpanel), or usage tracking.
- **No Crash or Diagnostic Reporting:** We do not automatically collect or upload system logs, crash dumps, or performance metrics.
- **No Request Inspection or Proxying:** Your API requests, URLs, headers, payloads, cookies, authentication tokens, and API responses are never routed through or stored on any intermediate servers operated by Melkam Studios.

---

## 3. How Your Data Is Handled and Stored

### Local-Only Storage
All application data—including:
- Request collections and folders
- Saved requests and request configurations
- Environment variables, secrets, and authorization tokens
- Request and response history
- Application preferences and settings

is stored **exclusively on your local device** in your local file system (`~/.mels/storage/` or your operating system's designated application storage directory).

### Direct Network Communications
When you execute an HTTP/HTTPS request in Mels:
- The network request is made directly from your machine's operating system network stack to the target server/URL you specify.
- Communication with external servers only occurs when you explicitly initiate an API call to a destination endpoint of your choosing.

### User Data Control and Deletion
- **Import / Export:** You can export your collections and environments to local files or import existing data at any time.
- **Data Deletion:** You can clear your history, collections, or environment variables at any time directly through the application settings or by deleting the local storage directory from your disk.

---

## 4. Third-Party Endpoints and Services

When you use Mels to send HTTP/HTTPS requests to third-party APIs and servers, those requests are governed by the respective privacy policies and terms of service of the third parties you are communicating with. We recommend reviewing the privacy practices of any third-party APIs you interact with.

---

## 5. Security of Sensitive Data

Because your sensitive data (such as API keys, Bearer tokens, and secrets) is stored on your local disk:
- We recommend maintaining appropriate security measures on your personal computer, including disk encryption (such as BitLocker or FileVault) and secure file permissions.
- Mels provides variable scoping (such as secret environment variables) to assist you in managing sensitive values locally.

---

## 6. Open Source Transparency

Mels is built with transparency in mind. The application source code is available for inspection and audit to verify our privacy, data-handling, and networking practices.

---

## 7. Changes to This Privacy Policy

If we make changes to this Privacy Policy (for instance, to reflect new features or legal requirements), we will update the "Last Updated" date at the top of this document. Any updates will remain aligned with our core commitment to local-first data ownership and zero telemetry.

---

## 8. Contact Us

If you have any questions, suggestions, or concerns regarding this Privacy Policy or your privacy while using Mels, please contact:

- **Author:** Mickyas Tesfaye
- **Studio:** Melkam Studios
- **Email:** [alazartesfaye42@gmail.com](mailto:alazartesfaye42@gmail.com)
