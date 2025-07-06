# QuiKart - E-commerce Platform

QuiKart is a modern, full-stack e-commerce web application designed to simulate a vibrant Ghanaian online market. It provides a complete shopping experience for customers and a comprehensive management dashboard for administrators.

The application is built with a modern tech stack, including **Next.js**, **React**, **Supabase** for the backend, and **Tailwind CSS** with **ShadCN UI** for the user interface.

---

## Core Features & Functionalities

### I. Customer-Facing Features

#### 1. **Authentication & Profile Management**
- **User Accounts:** Secure user registration using email/password and social sign-in via Google.
- **Password Recovery:** A complete "forgot password" flow that sends a reset link to the user's email.
- **Profile Page:** Logged-in users can view and update their personal information (name, email, phone) and manage their primary delivery address.

#### 2. **Product Discovery & Browsing**
- **Homepage:** Displays product listings, active advertisements, and category filters.
- **Advanced Search:** Features a search bar with real-time, auto-completing suggestions for both products and categories.
- **Filtering & Sorting:** Users can filter products by category, price range, and minimum star rating to easily find what they need.

#### 3. **Shopping & Ordering**
- **Product Details:** A dedicated page for each product showing multiple images, detailed descriptions, price, stock status, and customer reviews.
- **Customer Reviews:** Users can read reviews from others and logged-in users can submit their own star ratings and written comments.
- **Shopping Cart:** A fully functional cart where users can add items, update quantities, and remove products. The cart is persistent for logged-in users.
- **Wishlist:** Users can add products to a personal wishlist for later, which is saved in their browser.
- **Checkout Process:** A multi-step checkout process that includes:
  - **Delivery Details:** Prompts the user to confirm or enter their shipping address.
  - **Payment Simulation:** A sophisticated simulator for different payment methods, primarily featuring "Cash on Delivery". It includes UI for Mobile Money and Paystack.
  - **Order Placement:** Creates an order in the database and adjusts product stock levels accordingly.
- **Order History:** A dedicated page for users to view their past orders, including items, status, and total cost.

### II. Admin Panel Features (`/admin`)

#### 1. **Secure Admin Dashboard**
- **Role-Based Access:** All admin routes are protected, accessible only to users with the 'admin' role.
- **Statistical Overview:** The dashboard presents key metrics such as Total Revenue and Total Customers.

#### 2. **Store Management**
- **Vendor Management:** Admins can onboard new vendors by converting customer accounts, manage their verification status, and view their details.
- **Category Management:** Admins can add new product categories and manage their visibility across the site.
- **Advertisement Management:** A dedicated section for creating, editing, deleting, and activating/deactivating promotional ads (both images and videos), with media uploaded to Supabase Storage.

---

## Technical Stack

- **Framework:** Next.js (with App Router)
- **Frontend:** React, TypeScript
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **UI Components:** ShadCN UI
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **Forms:** React Hook Form with Zod for validation
"# quikartt" 
