import { createBrowserRouter, RouterProvider } from "react-router";
import { Home } from "./pages/home";
import { Login } from "./pages/login";
import { ForgotPassword } from "./pages/forgotPassword";
import { CompanyInterviewBooking } from "./pages/companyInterviewBooking";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./components/RequireAuth";
import { AIInterviewForm } from "./pages/aiInterviewForm";
import { StudentDashboard } from "./pages/studentDashboard";
import { BecomeInterviewer } from "./pages/becomeInterviewer";
import { PreJoinCheck } from "./pages/preJoinCheck";
import { AIInterviewAudioSession } from "./pages/aiInterviewAudioSession";

function App(){
  const router = createBrowserRouter([
    {
      path:'/',
      element: <Home/>
    },
    {
      path:'/login',
      element: <Login/>
    },
    {
      path:'/forgot-password',
      element: <ForgotPassword/>
    },
    {
      path: '/company-interview-booking',
      element: <RequireAuth><CompanyInterviewBooking/></RequireAuth>
    },
    {
      path: '/ai-interview-form',
      element: <RequireAuth><AIInterviewForm/></RequireAuth>
    },
    {
      path: '/dashboard',
      element: <RequireAuth><StudentDashboard/></RequireAuth>
    },
    {
      path: "/interview/ai/:id/prejoin-check",
      element: <RequireAuth> <PreJoinCheck /> </RequireAuth>
    },
    {
      path: "/interview/ai/:id",
      element: <RequireAuth> <AIInterviewAudioSession /> </RequireAuth>
    },
    {
      path: '/become-interviewer',
      element: <BecomeInterviewer/>
    }
  ])

  return (
    <AuthProvider>
      <RouterProvider router = {router} />
    </AuthProvider>
  )
}

export default App
