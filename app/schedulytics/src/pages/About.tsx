import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

function About() {
  return (
    <div className="about">
      <Canvas
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: -1,
        }}
        camera={{ position: [0, 0, 5], fov: 70 }}
      >
        <Suspense fallback={null}>{/* <Model /> */}</Suspense>
        <OrbitControls enableZoom={false} />
      </Canvas>
      <div className="content">
        <h1>About</h1>
      </div>
    </div>
  );
}

export default About;
