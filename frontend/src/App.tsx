import Homepage from './components/layout/Homepage.layout';
import './App.css';
import { Link } from 'react-router-dom';

function App() {
  return (
    <>
      <Homepage>
        <p>something for the body</p>
      </Homepage>
      <Link to={'/dashboard'}>link to dashboard </Link>
    </>
  );
}

export default App;
