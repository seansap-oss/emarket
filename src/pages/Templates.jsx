import React, { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "../lib/context";
import { showSamples } from "../lib/backend";
import { templates } from "../lib/templates";
const covers = {
  general: "chair.jpg",
  fashion: "hero-handloom.webp",
  electronics: "phone.jpg",
  vehicles: "car.jpg",
  motorcycles: "motorcycle.jpg",
};
export default function Templates() {
  const [selected, setSelected] = useState("fashion");
  const chosen = templates[selected];
  return (
    <div className="page template-gallery">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>Shop templates
      </div>
      <span className="eyebrow">A PLACE THAT FEELS LIKE YOURS</span>
      <h1>One address. Your own identity.</h1>
      <p>
        Choose what you sell. Your shop gets a matching layout, colours and
        product presentation. Add your own name, logo, photographs and
        collections.
      </p>
      <div className="template-picker" role="group" aria-label="Shop category">
        {Object.entries(templates).map(([key, t]) => (
          <button
            key={key}
            aria-pressed={selected === key}
            className={selected === key ? "active" : ""}
            onClick={() => setSelected(key)}
          >
            {t.category}
          </button>
        ))}
      </div>
      <section className={"template-preview theme-" + selected}>
        <img
          src={"/images/" + covers[selected]}
          alt={chosen.category + " storefront example"}
        />
        <div>
          <span className="eyebrow">{chosen.name} template</span>
          <h2>{chosen.headline}</h2>
          <p>{chosen.description}</p>
          <div className="chips">
            {chosen.sections.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          {showSamples && (
            <Link className="button primary" to={"/seller/" + chosen.sample}>
              Explore this sample shop <ArrowRight />
            </Link>
          )}
          <Link className="button outline" to={"/sell?template=" + selected}>
            Use this template
          </Link>
          <small>
            Sample photographs and illustrative prices. Real publishing requires
            an account.
          </small>
        </div>
      </section>
      <div className="template-explainer">
        <div>
          <strong>01 · Pick your category</strong>
          <p>Clothing, electronics, cars, motorcycles or retail.</p>
        </div>
        <div>
          <strong>02 · Make it yours</strong>
          <p>Add your name, logo, cover and social links.</p>
        </div>
        <div>
          <strong>03 · Build your collections</strong>
          <p>
            Organise products inside your own shop while remaining searchable
            across the marketplace.
          </p>
        </div>
      </div>
    </div>
  );
}
