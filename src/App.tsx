import { Suspense } from "react";
import { Container } from "react-bootstrap";
import "./App.css";
import Trainer from "./components/Trainer";


function App() {
  return (
    <Container>
      <Suspense>
        <Trainer />
      </Suspense>
    </Container>
  );
}

export default App;
