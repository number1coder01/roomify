import React from "react";
import { useLocation } from "react-router";

const visualizerId = () => {
  // to get access to the state
  // that we passed into the new page
  const location = useLocation();
  const { initialImage, name } = location.state || {};
  return (
    <section>
      <h1>{name || "Untitled Project"}</h1>
      <div className="visualizer">
        <div className="image-container">
          <h2>Source Image</h2>
          <img src={initialImage} alt="source" />
        </div>
      </div>
    </section>
  );
};

export default visualizerId;
