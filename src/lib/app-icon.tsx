import { ImageResponse } from "next/og";

const BRAND_COLOR = "#2e6b5a";

/** Renders the app icon (a check mark on the brand color) as a PNG. */
export function renderAppIcon(size: number): ImageResponse {
  const stroke = Math.round(size * 0.09);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLOR,
        }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12.5l5 5L20 6.5"
            stroke="white"
            strokeWidth={(stroke / size) * 24}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
