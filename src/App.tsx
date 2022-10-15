import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import Trainer from "./Trainer";
import { Container } from "react-bootstrap";


function App() {
  return (
    <Container>
      <Trainer />
    </Container>
  );
}

export default App;
