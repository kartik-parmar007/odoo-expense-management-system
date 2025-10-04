# Receipt Ace Hub

## Overview

Receipt Ace Hub is a modern expense management application built with React, TypeScript, and Supabase. This application provides a complete solution for managing expenses with role-based access control, multi-level approvals, and real-time tracking.

## Features

- Role-based dashboards (Admin, Manager, Employee)
- Expense submission and approval workflow
- Real-time tracking of expense status
- User management system
- Responsive design for all device sizes

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (Authentication, Database)
- **State Management**: React Query
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kartik-parmar007/receipt-ace-hub.git
   ```

2. Navigate to the project directory:
   ```bash
   cd receipt-ace-hub
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8080`.

## Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── integrations/   # Third-party service integrations
├── lib/            # Utility functions and helpers
├── pages/          # Page components
└── App.tsx         # Main application component
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
