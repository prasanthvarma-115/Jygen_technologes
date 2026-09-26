JYGEN CONTACT DATABASE SETUP

The Contact page is ready to save inquiries in a private Supabase table through the server-side /api/contact route. No database keys are included in this download. Until the route is configured, the form opens an email draft and clearly asks the visitor to press Send.

1. In your own Supabase project, open the SQL Editor and run supabase/contact_inquiries.sql. The table is private: public browser roles have no permission to read or insert inquiries. You can view stored inquiries in the Supabase Table Editor; a separate private dashboard can be built later.

2. In the hosting project's server-side environment settings, add SUPABASE_URL and SUPABASE_SECRET_KEY (the new sb_secret_... key). Never paste the secret key into HTML, frontend JavaScript, a public repository, or a screenshot. Deploy the jygen-complete folder as the project root with the api directory included. On Vercel, /api/contact is deployed from api/contact.js. For the local preview, npm run dev exposes the same route.

3. Submit a test inquiry on the deployed Contact page. Confirm that the page displays MESSAGE RECEIVED and that a row appears in public.contact_inquiries. Test missing configuration too: it must open an email draft instead of falsely claiming delivery. Verify the public /, /services/, /about/, and /contact/ routes, sitemap.xml and favicon.ico after deployment. They still point to the older live deployment until you publish this build.

4. The frontend cannot see or read the stored inquiries. For a later admin website, require real admin authentication and read data only through a trusted backend. Do not put the Supabase secret key in an admin browser app.

The form validates fields on the server, limits request size, checks same-origin browser requests and includes a spam honeypot. A production site receiving substantial spam will also need durable rate limiting or a challenge service at the server boundary.
