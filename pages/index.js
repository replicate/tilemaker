import { useState, useEffect, Fragment } from "react";
import Head from "next/head";
import FileSaver from "file-saver";
import useSound from "use-sound";
import { ArrowDownTrayIcon, PlusIcon } from "@heroicons/react/20/solid";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import "xp.css/dist/XP.css";

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
  {
    prompt: "flamingo painting",
    image:
      "https://replicate.delivery/pbxt/K2M3OVwEpSLxNdZDmEe8K5fIGN25TOUTQA7JnGb5n4fcsY2gA/out-0.jpg",
  },
];

export default function Home() {
  const example = examples[Math.floor(Math.random() * examples.length)];
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState(example.prompt);
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(4);
  const [total, setTotal] = useState(144);
  const [wallpaper, setWallpaper] = useState(example.image);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    var cols = Math.min(Math.ceil(window.innerWidth / 512), 12);
    var rows = Math.min(Math.ceil(window.innerHeight / 512), 12) + 1;
    resize(cols, rows);
  }, []);

  const resize = (cols, rows) => {
    setTotal(cols * rows);
    setCols(cols);
    setRows(rows);
  };

  const parseLogs = (logs) => {
    if (!logs) {
      return 0;
    } else {
      const lastLine = logs.split("\n").slice(-1)[0];
      const pct = lastLine.split("it")[0];
      return pct * 2;
    }
  };

  const [playActive] = useSound("/beep.mp3", { volume: 0.25 });
  const [playSuccess] = useSound("/ding.wav", { volume: 0.25 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("HELLO???");

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: e.target.prompt.value,
        width: "512",
        height: "512",
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
      console.log(prediction.logs);
      setStatus(parseLogs(prediction.logs));
      setPrediction(prediction);

      if (prediction.status === "succeeded") {
        resetWallpaper(prediction.output);
        setLoading(false);
      }
    }
  };

  const resetWallpaper = (image) => {
    setOpen(false);
    const tiles = document.getElementsByClassName("tile");
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove("animate-drop");
    }

    // const interval = setInterval(playActive, 100);

    setTimeout(() => {
      for (let i = 0; i < tiles.length; i++) {
        tiles[i].classList.add("animate-drop");
      }
      setWallpaper(image);
    }, 10);

    // setTimeout(() => {
    //   clearInterval(interval), playSuccess();
    // }, 1700);
  };

  const stitchImages = async (imageUrl) => {
    const image = await fetch(imageUrl);
    const imageBlob = await image.blob();
    const imageURL = URL.createObjectURL(imageBlob);

    var myCanvas = document.getElementById("canvas");
    var ctx = myCanvas.getContext("2d");

    const screenHeight = window.screen.height * window.devicePixelRatio;
    const screenWidth = window.screen.width * window.devicePixelRatio;

    ctx.canvas.width = screenWidth;
    ctx.canvas.height = screenHeight;

    var img = new Image();
    img.src = imageURL;

    var x = 0;
    var y = 0;

    img.addEventListener("load", (e) => {
      while (y < screenHeight) {
        while (x < screenWidth) {
          ctx.drawImage(img, x, y);
          x += 512;
        }
        x = 0;
        y += 512;
      }
    });

    ctx.fillStyle = "green";
    ctx.fillRect(100, 100, 100, 100);

    return myCanvas.toDataURL("image/png");
  };

  const download = async (image) => {
    stitchImages(image);

    // I couldn't figure out the async/await version of this
    // so I just used a setTimeout to wait for the canvas to be drawn
    setTimeout(() => {
      var myCanvas = document.getElementById("canvas");
      const dataUrl = myCanvas.toDataURL("image/png");
      FileSaver.saveAs(dataUrl, "wallpaper.png");
    }, 100);
  };

  return (
    <>
      <div className="relative min-h-screen">
        <Head>
          <title>Wallpaper Creator</title>
        </Head>

        {/* repeating tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {Array(total)
            .fill(1)
            .map((_value, index) => (
              <img
                key={`tile-${index}`}
                id={index}
                className="tile animate-drop"
                style={{ animationDelay: `${index * 0.1}s` }}
                src={wallpaper}
                alt=""
              />
            ))}
        </div>

        <div className="fixed hidden top-0 left-0">
          <canvas id="canvas" className="fixed top-0 left-0"></canvas>
        </div>

        <Form
          open={open}
          setOpen={setOpen}
          example={example}
          prompt={prompt}
          setPrompt={setPrompt}
          handleSubmit={handleSubmit}
          loading={loading}
          download={download}
          wallpaper={wallpaper}
          status={status}
        />

        {error && <div>{error}</div>}

        {prediction && <p>status: {prediction.status}</p>}
      </div>
    </>
  );
}

const people = [
  { id: 1, name: "Leslie Alexander", url: "#" },
  // More people...
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Form({
  open,
  setOpen,
  example,
  handleSubmit,
  loading,
  download,
  wallpaper,
  status,
}) {
  return (
    <Transition.Root show={open} as={Fragment} appear>
      <Dialog as="div" className="relative z-10" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="window mx-auto max-w-xl transform overflow-hidden rounded-xl shadow-2xl transition-all">
              <div className="title-bar">
                <div className="title-bar-text">Wallpaper Creator</div>
                <div className="title-bar-controls">
                  <button aria-label="Close"></button>
                </div>
              </div>

              <form onSubmit={handleSubmit} class="p-4">
                <Combobox>
                  <div className="relative">
                    <textarea
                      required={true}
                      name="prompt"
                      rows="3"
                      placeholder={example.prompt}
                      style={{ resize: "none" }}
                      className="w-full border-0 bg-transparent text-gray-800 placeholder-gray-400 focus:ring-0 text-xl"
                    />
                  </div>
                </Combobox>

                <div className="mt-4 pt-4">
                  {loading ? (
                    <div>
                      <progress
                        className="w-full"
                        max="100"
                        value={status}
                      ></progress>
                      {status}%
                      <span className="animate-pulse">
                        {" "}
                        Creating your wallpaper...
                      </span>
                    </div>
                  ) : (
                    <div class="text-right">
                      <button
                        type="button"
                        onClick={() => download(wallpaper)}
                        className="inline-flex mr-3 py-1 items-center"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5 mr-3" /> Download
                        wallpaper
                      </button>

                      <button
                        type="submit"
                        className="inline-flex items-center py-1"
                      >
                        <PlusIcon className="h-5 w-5 mr-3" />
                        Create wallpaper
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
