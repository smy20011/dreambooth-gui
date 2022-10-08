import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import Cli from "./Cli";
import { Container } from "react-bootstrap";


function App() {
  return (
    <Container fluid>
      <Cli />
    </Container>
  );
}

export default App;
