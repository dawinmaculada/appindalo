import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children, session }) {
  return session ? children : <Navigate to="/login" replace />;
}
