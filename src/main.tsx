import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// import { createRoot } from 'react-dom/client'
// import App from './App.tsx'
// import './index.css'
// import { AuthProvider } from './contexts/AuthContext'; // Add this import
// import { RoleProvider } from './contexts/RoleContext'; // Add this import

// createRoot(document.getElementById("root")!).render(
//   <AuthProvider>
//     <RoleProvider>
//       <App />
//     </RoleProvider>
//   </AuthProvider>
// );
