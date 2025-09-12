import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { Overview } from './pages'
import TransactionsPage from './pages/Transactions'
import BudgetsPage from './pages/Budgets'
import InvestmentsPage from './pages/Investments'
import AssetsPage from './pages/Assets'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Settings'
import LandingPage from './pages/Landing'
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'
import OnboardingPage from './pages/Onboarding'
import ProtectedRoutes from './pages/Protected'
import SessionOnly from './pages/SessionOnly'

// const Placeholder = ({ title }: { title: string }) => (
//   <div className="card p-6"><h1 className="text-lg font-medium">{title}</h1></div>
// )

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/onboarding', element: <SessionOnly />,
    children: [
      { index: true, element: <OnboardingPage /> },
    ]
  },
  {
    path: '/app',
    element: <ProtectedRoutes />,
    children: [
      {
        path: '',
        element: <AppLayout />,
        children: [
          { index: true, element: <Overview /> },
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'budgets', element: <BudgetsPage /> },
          { path: 'investments', element: <InvestmentsPage /> },
          { path: 'assets', element: <AssetsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
