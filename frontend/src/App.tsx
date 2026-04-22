import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <TaskProvider>
          <RouterProvider router={router} />
        </TaskProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
