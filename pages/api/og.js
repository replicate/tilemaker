import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

export default function (req) {
  const { searchParams } = req.nextUrl;
  const url = searchParams.get("url");

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
        }}
      >
        <img src={url} alt="" width={600} height={600} />
        <img src={url} alt="" width={600} height={600} />
        <img src={url} alt="" width={600} height={600} />
      </div>
    ),
    {
      width: 900,
      height: 600,
    }
  );
}
