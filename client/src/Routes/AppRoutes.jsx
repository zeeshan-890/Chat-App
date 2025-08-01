// src/routes/AppRoutes.jsx
import { Routes, Route } from 'react-router-dom';
import Signup from '../pages/Signup';
import Login from '../pages/Login';
import Home from "../pages/Home"
import Updateprofile from '../pages/Updateprofile.jsx';
import { userauthstore } from '../Store/UserAuthStore.jsx';
import ProtectedRoute from '../componenets/Protectedroute.jsx';
import { MdVideoCall } from 'react-icons/md';
import Videocall from "../pages/Videocall"



function AppRoutes() {

  const { user } = userauthstore()
  return (
    <Routes>

      <Route path="/Signup" element={<Signup />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute>{user ? <Home /> : <Login />}</ProtectedRoute>} />
      <Route path="/editprofile" element={<ProtectedRoute>{user ? <Updateprofile /> : <Login />}</ProtectedRoute>} />
      <Route path="/videocall" element={<ProtectedRoute>{user ? <Videocall /> : <Login />}</ProtectedRoute>} />

    </Routes>
  );
}

export default AppRoutes;
