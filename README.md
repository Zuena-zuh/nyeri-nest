# NyeriNest

### Find a place to call home.

NyeriNest is a Kenya-focused rental property marketplace designed to make finding and listing rental homes easier, starting with a pilot in Nyeri.

The platform connects prospective tenants with landlords through a simple property discovery and listing experience.

## Features

- **Property discovery** – Browse available rental properties.
- **Property listings** – Landlords can submit properties for review.
- **Landlord dashboard** – Manage submitted property listings.
- **Admin dashboard** – Review and manage property submissions.
- **Property photos** – Upload and display property images.
- **Authentication** – User registration and login powered by Supabase.
- **Listing verification workflow** – Property submissions go through an approval process.

## Tech Stack

- HTML5
- CSS3
- JavaScript
- Supabase
- PostgreSQL
- Supabase Storage
- Supabase Edge Functions

## Project Structure

```text
nyeri-nest/
│
├── index.html
├── style.css
├── script.js
├── admin.html
├── admin.js
├── list-property.html
├── list-property.js
├── my-listings.html
├── my-listings.js
├── supabase-client.js
├── package.json
├── package-lock.json
│
└── supabase/
    ├── config.toml
    └── functions/
        └── get-approved-property-photos/
            ├── index.ts
            ├── deno.json
            └── deno.lock
```

## Getting Started

### Prerequisites

- A modern web browser
- Visual Studio Code
- A Supabase project

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Zuena-zuh/nyeri-nest.git
   ```

2. Navigate into the project:

   ```bash
   cd nyeri-nest
   ```

3. Configure your Supabase project credentials using the appropriate local configuration.

4. Open the project using VS Code.

5. Run the application using a local development server, such as the VS Code Live Server extension.

## Security

- Environment files and local temporary files are excluded through `.gitignore`.
- Never commit service-role keys, database passwords, or other private credentials.
- Only use Supabase publishable keys in frontend code.
- Database access is protected using Supabase Row Level Security policies.

## Project Status

NyeriNest is an ongoing project, beginning with a rental marketplace pilot in Nyeri, Kenya.

Future improvements may include expanded property discovery, enhanced verification workflows, and additional marketplace functionality.

## Developer

**Zuena**

- GitHub: [@Zuena-zuh](https://github.com/Zuena-zuh)

---

*Built with care in Kenya 🇰🇪*
