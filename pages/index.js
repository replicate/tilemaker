import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const examples = [
  {
    prompt:
      "Muddy ground with autumn leaves seamless texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/9b8f4ec9-eef0-437f-a27a-cbd233d22407/out-0.png",
  },
  {
    prompt:
      "Lunar surface seamless texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/8f75db20-72d9-4917-bc86-db4ca5d73c35/out-0.png",
  },
  {
    prompt:
      "Tree bark seamless photoscan texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/7d3bc46c-612f-42cb-9347-317b2db1d3d6/out-0.png",
  },
];

export default function Home() {
  const example = examples[Math.floor(Math.random() * examples.length)];
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [cols, setCols] = useState("");
  const [rows, setRows] = useState("");
  const [total, setTotal] = useState(0);
  const [wallpaper, setWallpaper] = useState(example.image);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    var cols = Math.min(Math.round(window.innerWidth / 256), 12);
    var rows = Math.min(Math.round(window.innerHeight / 256), 12) + 1;
    setTotal(cols * rows);
    setCols(`grid-cols-${cols}`);
    setRows(`grid-rows-${rows}`);
    console.log(cols, rows);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: e.target.prompt.value,
      }),
    });
    let prediction = await response.json();
    if (response.status !== 201) {
      setError(prediction.detail);
      return;
    }
    setPrediction(prediction);
    setLoading(true);

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await sleep(1000);
      const response = await fetch("/api/predictions/" + prediction.id);
      prediction = await response.json();
      if (response.status !== 200) {
        setError(prediction.detail);
        return;
      }
      console.log({ prediction });
      setPrediction(prediction);

      if (prediction.status === "succeeded") {
        resetWallpaper(prediction.output);
        setLoading(false);
      }
    }
  };

  const resetWallpaper = (image) => {
    const tiles = document.getElementsByClassName("tile");
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove("animate-drop");
    }

    setTimeout(() => {
      for (let i = 0; i < tiles.length; i++) {
        tiles[i].classList.add("animate-drop");
      }
      setWallpaper(image);
    }, 10);
  };

  return (
    <div className="relative">
      <Head>
        <title>Wallpaper Creator</title>
      </Head>

      <div className={`grid ${rows} ${cols}`}>
        {Array(total)
          .fill(1)
          .map((_value, index) => (
            <>
              <img
                id={index}
                className="tile animate-drop"
                style={{ animationDelay: `${index * 0.1}s` }}
                src={wallpaper}
                alt=""
              />
            </>
          ))}
      </div>

      <form className="max-w-sm mx-auto absolute top-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          ></label>
          <div className="mt-1 border-gray-300 focus-within:border-indigo-600">
            <input
              type="text"
              name="prompt"
              id="name"
              className="block w-full rounded-lg bg-gray-50 focus:border-indigo-600 focus:ring-0 sm:text-sm"
              placeholder="Enter your wallpaper prompt"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            resetWallpaper(
              examples[Math.floor(Math.random() * examples.length)].image
            );
          }}
        >
          Set Wallpaper
        </button>

        <div className="mt-4 text-center">
          {loading ? (
            <button
              type="submit"
              disabled
              className="inline-flex animate-pulse items-center rounded-md border border-transparent bg-indigo-300 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Creating your wallpaper...
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Create your wallpaper
            </button>
          )}
        </div>
      </form>

      {error && <div>{error}</div>}

      {prediction && <p>status: {prediction.status}</p>}
    </div>
  );
}
