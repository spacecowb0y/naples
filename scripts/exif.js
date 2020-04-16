"use strict"
const fs = require("fs")
const exiftool = require("node-exiftool")
const exiftoolBin = require("dist-exiftool")
const ep = new exiftool.ExiftoolProcess(exiftoolBin)

const CAMERAS = {
  SONY: "Sony α6000",
  "LEICA CAMERA AG": "Leica Q",
}

ep.open()
  .then((pid) => {
    console.log("🏁  Started exiftool process %s", pid)
    console.log("📸  Extracting photo metadata...", pid)
    return ep
      .readMetadata("./public/images/")
      .then((res) => {
        logData(res)
      })
      .catch((error) => {
        console.log("Error: ", error)
      })
  })
  .then(() => {
    return ep.close().then(() => {
      console.log("✅  Metadata extracted! Closing exiftool.")
    })
  })
  .catch((error) => {
    console.error("🚨  Error extracting photo metadata!", error)
  })

let logData = (exifData) => {
  let fileInfo = []

  // Transform the data to remove all but the info we care about
  exifData.data.forEach((datum) => {
    // The aspect ratio here is actually in terms of
    // height:width (instead of typical width:height)
    // since they all have a fixed height relative to the
    // viewport
    const aspectRatio = datum.ImageSize.split("x")
      .map((n) => parseInt(n))
      .reduce((w, h) => w / h)

    const info = {
      aspectRatio,
      camera: datum.Model,
      fStop: datum.FNumber || 16,
      fileName: datum.FileName,
      // I only have one manual lens, but this ternary is a hacky workaround.
      focalLength: datum.FocalLength,
      iso: datum.ISO,
      shutterSpeed: String(datum.ShutterSpeed),
      description: datum.Description || "",
    }

    fileInfo.push(info)
  })

  // Sort the image data by filename
  fileInfo.sort((a, b) => {
    let keyA = parseInt(a.fileName.split(".")[0]),
      keyB = parseInt(b.fileName.split(".")[0])
    if (keyA < keyB) return -1
    if (keyA > keyB) return 1
    return 0
  })

  // Write data to file for the app to consume
  let writeString = `import { ImageData } from "../components/App"
const imageData: Array<ImageData> = ${JSON.stringify(fileInfo, null, " ")}
export default imageData`

  fs.writeFile("./data/manifest.ts", writeString, (err) => {
    if (err) return console.log(err)
  })
}
