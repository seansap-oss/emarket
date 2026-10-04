import React from "react";

export function BrandMark({ size = 40 }) {
  return (
    <img
      className="brand-mark"
      src="/brand-mark.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
    />
  );
}
