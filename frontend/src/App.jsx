import { Routes, Route } from 'react-router-dom'
import IncomeForm from './pages/IncomeForm'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<IncomeForm />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App
