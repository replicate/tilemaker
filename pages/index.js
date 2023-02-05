import { useState, useEffect, Fragment } from "react";
import Head from "next/head";
import FileSaver from "file-saver";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from "@heroicons/react/20/solid";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import "xp.css/dist/XP.css";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IMAGE_SIZE = 256;

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
  {
    prompt:
      "Ancient carvings trim sheet texture, trending on artstation, sandstone, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/147f2329-db56-4a6a-a950-7a358f731fb7/out-0.png",
  },
  {
    prompt:
      "Wall made from chocolate bars seamless texture, trending on artstation, tasty, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/9c645c58-82e8-4d88-bb7d-972472978698/out-0.png",
  },
];

export default function Home() {
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [cols, setCols] = useState(null);
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(null);
  const [wallpaper, setWallpaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [placeholder, setPlaceholder] = useState(
    examples[Math.floor(Math.random() * examples.length)].prompt
  );

  useEffect(() => {
    // On page load, set the grid cols/rows based on the window size
    var cols = Math.min(Math.ceil(window.innerWidth / IMAGE_SIZE), 12);
    var rows = Math.min(Math.ceil(window.innerHeight / IMAGE_SIZE), 12) + 1;
    const example = examples[Math.floor(Math.random() * examples.length)];
    setWallpaper(example.image);
    setPlaceholder(example.prompt);
    setPrompt(example.prompt);
    resize(cols, rows);

    // Wait a second before showing modal
    setTimeout(() => {
      setOpen(true);
    }, 2000);
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

    setTimeout(() => {
      for (let i = 0; i < tiles.length; i++) {
        tiles[i].classList.add("animate-drop");
      }
      setWallpaper(image);
    }, 10);
  };

  const stitchImages = async (imageUrl) => {
    /**
     * Given a url for an image (which comes from replicate),
     * stitch it into a canvas and return the canvas so we can download it.
     *
     * Surprisingly complicated I know, but seems like it's necessary to download a grid of images.
     */
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
      <div className="relative min-h-screen bg-blue-900">
        <Head>
          <title>Wallpaper Creator</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
          ></meta>
        </Head>
        <div class="title-bar">
          <div class="title-bar-text">
            Wallpaper Creator 3000 •{" "}
            <a
              href="https://replicate.com"
              className="text-blue-100 italic hover:text-white"
            >
              Built on Replicate™
            </a>
          </div>
        </div>

        {/* App Icons */}
        <div className="absolute z-10 top-16 left-16">
          <div className="grid gap-8">
            <button
              className="bg-transparent bg-none border-none p-2 hover:bg-blue-100  hover:bg-opacity-50 text-white hover:text-gray-900"
              onClick={() => setOpen(true)}
            >
              <span className="text-6xl sm:text-8xl">🖼️</span>

              <p className="font-bold text-lg">New Wallpaper</p>
            </button>
            <button
              className="bg-transparent bg-none border-none p-2 hover:bg-blue-100 hover:bg-opacity-50 text-white hover:text-gray-900"
              onClick={() => download(wallpaper)}
            >
              <span className="text-6xl sm:text-8xl">💾</span>

              <p className="font-bold text-lg">
                Save <br /> Wallpaper
              </p>
            </button>
            <button
              className="bg-transparent bg-none border-none p-2 hover:bg-blue-100 hover:bg-opacity-50 text-white hover:text-gray-900"
              onClick={() => setOpen(true)}
            >
              <span className="text-6xl sm:text-8xl">❔</span>

              <p className="font-bold text-lg">About</p>
            </button>
          </div>
        </div>

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
          prompt={prompt}
          setPrompt={setPrompt}
          handleSubmit={handleSubmit}
          loading={loading}
          download={download}
          wallpaper={wallpaper}
          status={status}
          resetWallpaper={resetWallpaper}
          setLoading={setLoading}
          placeholder={placeholder}
        />
        {error && <div>{error}</div>}
        {prediction && <p>status: {prediction.status}</p>}
      </div>
    </>
  );
}

export function Form({
  open,
  setOpen,
  handleSubmit,
  loading,
  status,
  resetWallpaper,
  prompt,
  setPrompt,
  setLoading,
  placeholder,
}) {
  const handleInspire = () => {
    const newWallpaper = examples[Math.floor(Math.random() * examples.length)];

    typeWriter("", newWallpaper);
  };

  const typeWriter = (prompt, newWallpaper, callback) => {
    var i = 0;
    const txt = newWallpaper.prompt;

    var interval = setInterval(() => {
      if (i < txt.length) {
        setPrompt((prompt += txt.charAt(i)));

        i++;
      } else {
        clearInterval(interval);
        setLoading(true);

        // pause before closing modal, so user can see new prompt for a second
        setTimeout(() => {
          resetWallpaper(newWallpaper.image);
          setLoading(false);
        }, 3000);
      }
    }, 10);
  };

  return (
    <Transition.Root show={open} as={Fragment} appear>
      <Dialog
        autoFocus={false}
        as="div"
        className="relative z-10"
        onClose={setOpen}
      >
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

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20 mt-32">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="window mx-auto max-w-xl transform overflow-hidden shadow-2xl transition-all">
              <div className="title-bar">
                <div className="title-bar-text">Wallpaper Creator</div>
                <div className="title-bar-controls">
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className=""
                  ></button>
                </div>
              </div>
              <div className="window-body">
                <form onSubmit={handleSubmit} class="">
                  <fieldset>
                    <Combobox>
                      <div className="mt-4">
                        <p>
                          Welcome! This app uses{" "}
                          <a href="https://replicate.com/tommoore515/material_stable_diffusion">
                            material stable diffusion
                          </a>{" "}
                          to create tileable images from a description. Try it
                          out by describing your next wallpaper:
                        </p>

                        <hr className="mt-2" />

                        <textarea
                          required={true}
                          name="prompt"
                          autoFocus
                          id="prompt"
                          rows="3"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={placeholder}
                          style={{ resize: "none" }}
                          className="rounded-sm text-black font-sans font-bold py-2 w-full border border-gray-300 border-t-2"
                        />
                      </div>
                    </Combobox>

                    <div className="mt-4 pt-4">
                      {loading ? (
                        <div>
                          {status ? (
                            <progress
                              className="w-full"
                              max="100"
                              value={status}
                            ></progress>
                          ) : (
                            // Does a nice booting up animation if no value is given
                            <progress className="w-full" max="100"></progress>
                          )}

                          {status ? (
                            <div>
                              {status}%
                              <span className="animate-pulse">
                                {" "}
                                Creating your wallpaper...
                              </span>
                            </div>
                          ) : (
                            <span className="animate-pulse">Booting up...</span>
                          )}
                        </div>
                      ) : (
                        <div class="flex justify-between">
                          <button
                            type="button"
                            onClick={() => setPrompt("")}
                            className="inline-flex mr-3 py-1 items-center"
                          >
                            Clear text
                          </button>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleInspire()}
                              className="inline-flex mr-3 py-1 items-center"
                            >
                              <ArrowPathIcon className="h-5 w-5 mr-3" />
                              Example
                            </button>
                            <button
                              type="submit"
                              className="inline-flex items-center py-1 bg-green-500 text-white"
                            >
                              <PlusIcon className="h-5 w-5 mr-3" />
                              Create{" "}
                              <span className="hidden pl-0.5 sm:inline-block">
                                {" "}
                                new wallpaper
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </fieldset>
                </form>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export function About({ aboutOpen, setAboutOpen }) {
  const handleInspire = () => {
    const newWallpaper = examples[Math.floor(Math.random() * examples.length)];

    setPrompt(newWallpaper.prompt);
    setLoading(true);

    // pass before closing modal, so user can see new prompt for a second
    setTimeout(() => {
      resetWallpaper(newWallpaper.image);
      setLoading(false);
    }, 3000);
  };
  return (
    <Transition.Root show={open} as={Fragment} appear>
      <Dialog
        autoFocus={false}
        as="div"
        className="relative z-10"
        onClose={setOpen}
      >
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

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20 mt-32">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="window mx-auto max-w-xl transform overflow-hidden shadow-2xl transition-all">
              <div className="title-bar">
                <div className="title-bar-text">Wallpaper Creator</div>
                <div className="title-bar-controls">
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className=""
                  ></button>
                </div>
              </div>
              <div className="window-body">
                <form onSubmit={handleSubmit} class="">
                  <fieldset>
                    <Combobox>
                      <div className="mt-4">
                        <p>
                          Welcome! This app uses{" "}
                          <a href="https://replicate.com/tommoore515/material_stable_diffusion">
                            material stable diffusion
                          </a>{" "}
                          to create tileable images from a description. Try it
                          out by describing your next wallpaper:
                        </p>

                        <textarea
                          required={true}
                          name="prompt"
                          autoFocus
                          id="prompt"
                          rows="3"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={placeholder}
                          style={{ resize: "none" }}
                          className="rounded-sm bg-black text-white px-2 py-2 mt-2 w-full ring-0 focus-within:ring-0 text-xl"
                        />
                      </div>
                    </Combobox>

                    <div className="mt-4 pt-4">
                      {loading ? (
                        <div>
                          {status ? (
                            <progress
                              className="w-full"
                              max="100"
                              value={status}
                            ></progress>
                          ) : (
                            // Does a nice booting up animation if no value is given
                            <progress className="w-full" max="100"></progress>
                          )}

                          {status ? (
                            <div>
                              {status}%
                              <span className="animate-pulse">
                                {" "}
                                Creating your wallpaper...
                              </span>
                            </div>
                          ) : (
                            <span className="animate-pulse">Booting up...</span>
                          )}
                        </div>
                      ) : (
                        <div class="flex justify-between">
                          <button
                            type="button"
                            onClick={() => setPrompt("")}
                            className="inline-flex mr-3 py-1 items-center"
                          >
                            Clear text
                          </button>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleInspire()}
                              className="inline-flex mr-3 py-1 items-center"
                            >
                              <ArrowPathIcon className="h-5 w-5 mr-3" />
                              Example
                            </button>
                            <button
                              type="submit"
                              className="inline-flex items-center py-1 bg-green-500 text-white"
                            >
                              <PlusIcon className="h-5 w-5 mr-3" />
                              Create{" "}
                              <span className="hidden pl-0.5 sm:inline-block">
                                {" "}
                                new wallpaper
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </fieldset>
                </form>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
