import { Calculator, MathBackground } from "./components";
import "./App.css";

function App() {
  return (
    <main className="app">
      <MathBackground />
      <div className="app__content">
        <Calculator />
      </div>
    </main>
  );
}

export default App;
