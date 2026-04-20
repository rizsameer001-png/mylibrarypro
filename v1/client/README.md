# LMS Client — React + Vite + Tailwind CSS

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173
```

Make sure the server is running on port 5000.

## Pages & Routes

| Path                  | Access     | Description           |
|-----------------------|------------|-----------------------|
| /                     | Public     | Landing page          |
| /books                | Public     | Browse books          |
| /books/:id            | Public     | Book detail + reserve |
| /login                | Public     | Login                 |
| /register             | Public     | Register              |
| /forgot-password      | Public     | Forgot password       |
| /profile              | Auth       | User profile          |
| /my-books             | Member     | My circulation        |
| /admin                | Admin/Mgr  | Dashboard             |
| /admin/books          | Admin/Mgr  | Manage books          |
| /admin/users          | Admin/Mgr  | Manage users          |
| /admin/circulation    | Admin/Mgr  | Issue/return books    |
| /admin/categories     | Admin/Mgr  | Categories, authors   |
| /admin/penalties      | Admin/Mgr  | Fines management      |
| /admin/memberships    | Admin      | Membership plans      |
| /admin/reports        | Admin/Mgr  | Reports & exports     |
| /admin/cms            | Admin      | Landing page content  |
| /admin/settings       | Admin      | System configuration  |

## Tech Stack
- React 18 + Vite
- Tailwind CSS 3
- React Router v6
- Axios
- Chart.js + react-chartjs-2
- React Hot Toast
- Heroicons
- date-fns
