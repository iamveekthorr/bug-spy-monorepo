import { Link } from 'react-router-dom';
import Index from '@/components/Index';

function App() {
  return (
    <>
      <Index />
      <Link to={'/dashboard'}>link to dashboard </Link>
    </>
  );
}

export default App;
